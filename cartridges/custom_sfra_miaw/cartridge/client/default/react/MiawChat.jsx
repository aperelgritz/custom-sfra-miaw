import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FaPaperPlane, FaSignOutAlt } from 'react-icons/fa';
import './MiawChat.css';

const MiawChat = () => {
	const [accessToken, setAccessToken] = useState(null);
	const [error, setError] = useState(null);
	const [conversationId, setConversationId] = useState(null);
	const [messages, setMessages] = useState([]);
	const [inputText, setInputText] = useState('');
	const [sseReader, setSSEReader] = useState(null);
	const [sessionEnded, setSessionEnded] = useState(false);
	const [isTyping, setIsTyping] = useState(false);

	const apiBaseUrl = 'https://rcg-ido-spring24.my.salesforce-scrt.com/iamessage/api/v2';
	const sseEndpoint = 'https://sse-cors-proxy-f4797ef2b8f2.herokuapp.com/sse';

	useEffect(() => {
		const initializeChat = async () => {
			try {
				if (!accessToken) {
					console.log('Fetching access token...');
					await fetchAccessToken();
				} else {
					console.log('Access token already exists:', accessToken);
					console.log('Starting SSE stream...');
					await startSSE();
				}
			} catch (err) {
				console.error('Error during initialization:', err.message);
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
					orgId: '00D0900000DYKY0',
					esDeveloperName: 'MIAW_Custom_for_Kiehls_Apex',
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
				body: JSON.stringify({ conversationId: convId, esDeveloperName: 'MIAW_Custom_for_Kiehls_Apex' }),
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
					'X-Org-Id': '00D0900000DYKY0',
				},
			});
			const reader = response.body.getReader();
			console.log('SSE stream started successfully.');
			setSSEReader(reader);
			const decoder = new TextDecoder();
			let partialData = '';
			while (true) {
				const { value, done } = await reader.read();
				if (done) break;
				partialData += decoder.decode(value, { stream: true });
				const lines = partialData.split('\n');
				partialData = lines.pop();
				lines.forEach((line) => {
					if (line.startsWith('data:')) {
						try {
							const eventData = JSON.parse(line.replace('data:', '').trim());
							const entryType = eventData.conversationEntry?.entryType;
							if (entryType === 'Message') {
								const role = eventData.conversationEntry.sender?.role === 'EndUser' ? 'EndUser' : 'ChatBot';
								const payload = JSON.parse(eventData.conversationEntry.entryPayload);
								const textValue = payload?.abstractMessage?.staticContent?.text;
								setMessages((prev) => [...prev, { id: uuidv4(), role, text: textValue.replace(/\n/g, '<br/>') }]);
								setIsTyping(false); // Remove typing indicator on message
							} else if (entryType === 'TypingStartedIndicator') {
								setIsTyping(true);
							} else if (entryType === 'TypingStoppedIndicator') {
								setIsTyping(false);
							}
						} catch {}
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
			await fetch(`${apiBaseUrl}/conversation/${conversationId}/session?esDeveloperName=MIAW_Custom_for_Kiehls_Apex`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			await fetch(`${apiBaseUrl}/conversation/${conversationId}?esDeveloperName=MIAW_Custom_for_Kiehls_Apex`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			if (sseReader) sseReader.cancel();
			setConversationId(null);
			setSessionEnded(true);
			console.log('Conversation ended');
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
					esDeveloperName: 'MIAW_Custom_for_Kiehls_Apex',
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
						<div className='bubble-text' dangerouslySetInnerHTML={{ __html: msg.text }} />
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
						</button>
						<button onClick={endSession} className='end-button' disabled={sessionEnded}>
							<FaSignOutAlt />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default MiawChat;
