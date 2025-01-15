import React from 'react';
import { createRoot } from 'react-dom/client';
import MiawChatV4 from './MiawChatV4';

document.addEventListener('DOMContentLoaded', () => {
	// Get the container element
	const reactContainer = document.getElementById('react-component');

	if (reactContainer) {
		const root = createRoot(reactContainer);
		root.render(<MiawChatV4 />);
	} else {
		console.error('React container element not found!');
	}
});
