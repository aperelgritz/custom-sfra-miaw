import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FaPaperPlane, FaSignOutAlt, FaAngleLeft, FaAngleRight } from 'react-icons/fa';
import './MiawChatV4.css';

const MiawChatV4 = () => {
	const [accessToken, setAccessToken] = useState(null);
	const [error, setError] = useState(null);
	const [conversationId, setConversationId] = useState(null);
	const [messages, setMessages] = useState([]);
	const [inputText, setInputText] = useState('');
	const [sseReader, setSSEReader] = useState(null);
	const [sessionEnded, setSessionEnded] = useState(false);
	const [isTyping, setIsTyping] = useState(false);
	const carouselRef = useRef(null);

	const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
	const sseEndpoint = process.env.REACT_APP_SSE_URL;
	const orgId = process.env.REACT_APP_ORG_ID;
	const esDeveloperName = process.env.REACT_APP_SVC_DEPLOYMENT;

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

	const fetchAccessToken = async () => {
		try {
			const response = await fetch(`${apiBaseUrl}/authorization/unauthenticated/access-token`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
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
					Accept: 'ext/event-stream',
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

							// Validate and parse JSON
							let eventData;
							try {
								eventData = JSON.parse(rawPayload);
							} catch (parseError) {
								console.warn('Malformed JSON in SSE stream:', rawPayload);
								return; // Skip invalid JSON lines
							}

							const entryType = eventData.conversationEntry?.entryType;
							if (entryType === 'Message') {
								const role = eventData.conversationEntry.sender?.role === 'EndUser' ? 'EndUser' : 'ChatBot';
								const escapedPayload = eventData.conversationEntry.entryPayload;

								try {
									const unescapedPayload = JSON.parse(escapedPayload);
									const textValue = unescapedPayload?.abstractMessage?.staticContent?.text;

									// Process the parsed content
									let parsedText;
									const jsonStart = textValue?.indexOf('{');
									const jsonEnd = textValue?.lastIndexOf('}') + 1;
									if (jsonStart !== -1 && jsonEnd > jsonStart) {
										const jsonText = textValue.slice(jsonStart, jsonEnd);
										const textBefore = textValue.slice(0, jsonStart).trim().replace(/\n/g, '<br>');
										const textAfter = textValue.slice(jsonEnd).trim().replace(/\n/g, '<br>');

										const normalizedJson = jsonText.replace(/\\n/g, '').replace(/\\"/g, '"');
										const jsonData = JSON.parse(normalizedJson);
										const { standaloneText, setsOfProducts, overallClosingText } = jsonData;

										const parsedContent = (
											<div>
												{standaloneText && <p className='text-container'>{standaloneText}</p>}
												{setsOfProducts &&
													setsOfProducts.map((set, idx) => (
														<div key={idx}>
															{set.introText && <p className='text-container'>{set.introText}</p>}
															<div className='carousel-products'>
																{set.products.length > 2 && (
																	<button className='carousel-button left' onClick={() => scrollCarousel(-350)}>
																		<FaAngleLeft />
																	</button>
																)}
																<div className='product-carousel' ref={carouselRef}>
																	{set.products.map((product, idx) => (
																		<div key={idx} className='carousel-item'>
																			<a href={product.product_url} target='_blank' rel='noopener noreferrer'>
																				<img
																					src={product.product_image}
																					alt={product.product_name}
																					className='product-image'
																				/>
																				<div>{product.product_name}</div>
																			</a>
																			<p>{product.product_price}</p>
																			<p>{product.matchReason.replace(/"/g, '&quot;')}</p>
																		</div>
																	))}
																</div>
																{set.products.length > 2 && (
																	<button className='carousel-button right' onClick={() => scrollCarousel(350)}>
																		<FaAngleRight />
																	</button>
																)}
															</div>
															{set.closingText && <p className='text-container'>{set.closingText}</p>}
														</div>
													))}
												{overallClosingText && <p className='text-container'>{overallClosingText}</p>}
											</div>
										);

										parsedText = (
											<div>
												{textBefore && (
													<p
														className='text-around-json'
														dangerouslySetInnerHTML={{
															__html: textBefore,
														}}
													/>
												)}
												{parsedContent}
												{textAfter && (
													<p
														className='text-around-json'
														dangerouslySetInnerHTML={{
															__html: textAfter,
														}}
													/>
												)}
											</div>
										);
									} else {
										parsedText = (
											<span
												dangerouslySetInnerHTML={{
													__html: textValue?.replace(/\n/g, '<br/>'),
												}}
											></span>
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

	const scrollCarousel = (scrollOffset) => {
		if (carouselRef.current) {
			carouselRef.current.scrollBy({ left: scrollOffset, behavior: 'smooth' });
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
		<div className='chat-container'>
			<h1 className='chat-title'>Tell us what you're looking for!</h1>
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
			<div className='chat-input-area'>
				<div className='chat-input-container'>
					<div className='chat-input'>
						<input
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
					</div>
				</div>
			</div>
		</div>
	);
};

export default MiawChatV4;
