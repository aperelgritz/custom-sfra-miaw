import React from 'react';
import { createRoot } from 'react-dom/client';
import MiawChatV6 from './MiawChatV6';

document.addEventListener('DOMContentLoaded', () => {
	// Get the container element
	const reactContainer = document.getElementById('react-component');

	if (reactContainer) {
		const root = createRoot(reactContainer);
		root.render(<MiawChatV6 />);
	} else {
		console.error('React container element not found!');
	}
});
