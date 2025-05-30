import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import ProductGrid from './ProductGrid';

import { FaPaperPlane, FaSignOutAlt, FaAngleLeft, FaAngleRight } from 'react-icons/fa';
import './MiawChatV5.css';

const MiawChatV5 = () => {
	const [accessToken, setAccessToken] = useState(null);
	const [error, setError] = useState(null);
	const [conversationId, setConversationId] = useState(null);
	const [messages, setMessages] = useState([]);
	const [inputText, setInputText] = useState('');
	const [sseReader, setSSEReader] = useState(null);
	const [sessionEnded, setSessionEnded] = useState(false);
	const [isTyping, setIsTyping] = useState(false);
	const [pids, setPids] = useState([]);
	const carouselRef = useRef(null);
	const inputRef = useRef(null);

	const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
	const sseEndpoint = process.env.REACT_APP_SSE_URL;
	const orgId = process.env.REACT_APP_ORG_ID;
	const esDeveloperName = process.env.REACT_APP_SVC_DEPLOYMENT;

	// Initialize chat
	useEffect(() => {
		const initializeChat = async () => {
			try {
				if (!accessToken) {
					await fetchAccessToken();
				} else {
					await startSSE();
				}
			} catch (err) {
				setError('Initialization failed.');
			}
		};
		initializeChat();
	}, [accessToken]);

	// Focus on input
	useEffect(() => {
		if (!isTyping && !sessionEnded) {
			inputRef.current?.focus();
		}
	}, [isTyping, sessionEnded]);

	const fetchAccessToken = async () => {
		try {
			const response = await fetch(`${apiBaseUrl}/authorization/unauthenticated/access-token`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					orgId,
					esDeveloperName,
					capabilitiesVersion: '1',
					platform: 'Web',
					context: {
						appName: 'KiehlsSite',
						clientVersion: '1.0',
					},
				}),
			});
			if (!response.ok) throw new Error(`Error: ${response.statusText}`);
			const data = await response.json();
			setAccessToken(data.accessToken);
		} catch (err) {
			setError(err.message);
			throw err;
		}
	};

	const createConversation = async () => {
		if (!accessToken) return;
		try {
			const convId = uuidv4();
			const response = await fetch(`${apiBaseUrl}/conversation`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify({ conversationId: convId, esDeveloperName }),
			});
			if (response.status !== 201) throw new Error('Failed to create conversation');
			setConversationId(convId);
		} catch (err) {
			setError(err.message);
			throw err;
		}
	};

	const startSSE = async () => {
		if (!accessToken) return;
		try {
			await createConversation();
			const response = await fetch(sseEndpoint, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: 'text/event-stream',
					'X-Org-Id': orgId,
				},
			});
			const reader = response.body.getReader();
			setSSEReader(reader);
			const decoder = new TextDecoder();
			let partialData = '';

			while (true) {
				const { value, done } = await reader.read();
				if (done) break;

				partialData += decoder.decode(value, { stream: true });
				const lines = partialData.split('\n');
				partialData = lines.pop(); // Preserve incomplete data for next iteration

				lines.forEach((line) => {
					if (line.startsWith('data:')) {
						try {
							const rawPayload = line.replace('data:', '').trim();

							let eventData;
							try {
								eventData = JSON.parse(rawPayload);
							} catch (parseError) {
								console.warn('Malformed JSON in SSE stream:', rawPayload);
								return;
							}

							const entryType = eventData.conversationEntry?.entryType;
							if (entryType === 'Message') {
								const role = eventData.conversationEntry.sender?.role === 'EndUser' ? 'EndUser' : 'ChatBot';
								const escapedPayload = eventData.conversationEntry.entryPayload;

								try {
									const unescapedPayload = JSON.parse(escapedPayload);
									const textValue = unescapedPayload?.abstractMessage?.staticContent?.text;

									let parsedText;
									const jsonMatch = textValue?.match(/\{.*\}/s);
									if (jsonMatch) {
										try {
											let jsonText = jsonMatch[0];
											jsonText = jsonText.replace(/(?<!\\)"(.*?)"/g, (match, p1) => `"${p1.replace(/"/g, '\\"')}"`);
											jsonText = jsonText.replace(/(?<=\w):(?=\w)/g, '\\:'); // Escape unescaped colons
											jsonText = jsonText.replace(/[\u0000-\u001F\u007F]/g, ''); // Remove control characters
											const jsonData = JSON.parse(jsonText);
											const { conversationAnswer, productIds } = jsonData;
											console.log(`conversationAnswer: ${conversationAnswer}`);
											console.log(`productIds: ${productIds}`);
											if (productIds?.length > 0) setPids(productIds);

											// const parsedContent = (
											// 	<div>
											// 		{conversationAnswer && (
											// 			<span
											// 				className='text-container'
											// 				dangerouslySetInnerHTML={{ __html: conversationAnswer.replace(/\n/g, '<br/>') }}
											// 			></span>
											// 		)}
											// 	</div>
											// );
											const parsedContent = (
												<div className='text-container'>
													{conversationAnswer && (
														<ReactMarkdown remarkPlugins={[remarkGfm]}>{conversationAnswer}</ReactMarkdown>
													)}
												</div>
											);

											parsedText = <div>{parsedContent}</div>;
										} catch (jsonParseError) {
											console.error('Error parsing JSON from textValue:', jsonParseError);
											parsedText = <span>{textValue}</span>;
										}
									} else {
										// parsedText = <span dangerouslySetInnerHTML={{ __html: textValue?.replace(/\n/g, '<br/>') }}></span>;
										parsedText = (
											<div className='text-container'>
												<ReactMarkdown remarkPlugins={[remarkGfm]}>{textValue}</ReactMarkdown>
											</div>
										);
									}

									setMessages((prev) => [
										...prev,
										{
											id: uuidv4(),
											role,
											text: parsedText,
										},
									]);
									setIsTyping(false);
								} catch (payloadError) {
									console.error('Error parsing conversation entry payload:', escapedPayload, payloadError);
								}
							} else if (entryType === 'TypingStartedIndicator') {
								setIsTyping(true);
							} else if (entryType === 'TypingStoppedIndicator') {
								setIsTyping(false);
							}
						} catch (err) {
							console.error('Error parsing SSE JSON:', line, err);
						}
					}
				});
			}
		} catch (err) {
			setError(err.message);
		}
	};

	const endSession = async () => {
		if (!conversationId) return;
		try {
			await fetch(`${apiBaseUrl}/conversation/${conversationId}/session?esDeveloperName=${esDeveloperName}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			await fetch(`${apiBaseUrl}/conversation/${conversationId}?esDeveloperName=${esDeveloperName}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			if (sseReader) sseReader.cancel();
			setConversationId(null);
			setSessionEnded(true);
		} catch (err) {
			setError(err.message);
		}
	};

	const sendMessage = async () => {
		if (!conversationId) return;
		try {
			const messageId = uuidv4();
			await fetch(`${apiBaseUrl}/conversation/${conversationId}/message`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify({
					message: {
						id: messageId,
						messageType: 'StaticContentMessage',
						staticContent: { formatType: 'Text', text: inputText },
					},
					esDeveloperName: esDeveloperName,
				}),
			});
			setInputText('');
		} catch (err) {
			setError(err.message);
		}
	};

	const handleKeyPress = (e) => {
		if (e.key === 'Enter') sendMessage();
	};

	return (
		<div className='product-finder'>
			<div className='product-finder__left-panel'>
				<div className='chat-container'>
					{/* <h1 className='chat-title'>Tell us what you're looking for!</h1> */}
					<div className='chat-window'>
						{messages.map((msg) => (
							<div key={msg.id} className={`chat-bubble ${msg.role === 'EndUser' ? 'user' : 'assistant'}`}>
								<div className='bubble-text'>{msg.text}</div>
							</div>
						))}
						{isTyping && (
							<div className='typing-section'>
								<span className='typing-message'>Agent is typing...</span>
								<div className='wave'>
									<span className='dot'></span>
									<span className='dot'></span>
									<span className='dot'></span>
								</div>
							</div>
						)}
						{sessionEnded && (
							<div className='session-ended-message'>
								<p>The agent session has ended.</p>
							</div>
						)}
					</div>
				</div>
			</div>
			<div className='product-finder__right-panel'>
				<ProductGrid pids={pids} />
			</div>
			<div className='chat-input-area'>
				<div className='chat-input-container'>
					<div className='chat-input'>
						{isTyping ? (
							<>
								<input type='text' value='Agent is typing...' disabled />
								<button className='send-button' disabled>
									<FaPaperPlane />
									<span className='tooltip'>Send message</span>
								</button>
								<button className='end-button' disabled>
									<FaSignOutAlt />
									<span className='tooltip'>End session</span>
								</button>
							</>
						) : (
							<>
								<input
									ref={inputRef}
									type='text'
									value={inputText}
									onChange={(e) => setInputText(e.target.value)}
									onKeyPress={handleKeyPress}
									placeholder='Start typing...'
									disabled={sessionEnded}
								/>
								<button onClick={sendMessage} className='send-button' disabled={sessionEnded}>
									<FaPaperPlane />
									<span className='tooltip'>Send message</span>
								</button>
								<button onClick={endSession} className='end-button' disabled={sessionEnded}>
									<FaSignOutAlt />
									<span className='tooltip'>End session</span>
								</button>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default MiawChatV5;
