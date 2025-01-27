import React from 'react';
import { createRoot } from 'react-dom/client';
import MiawChatV5 from './MiawChatV5';

document.addEventListener('DOMContentLoaded', () => {
	// Get the container element
	const reactContainer = document.getElementById('react-component');

	if (reactContainer) {
		const root = createRoot(reactContainer);
		root.render(<MiawChatV5 />);
	} else {
		console.error('React container element not found!');
	}
});
