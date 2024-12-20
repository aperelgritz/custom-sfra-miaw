import React from 'react';
import { createRoot } from 'react-dom/client';
import MiawChatV3 from './MiawChatV3';

// const root = createRoot(document.getElementById('react-component'));
// root.render(<MiawChat />);

document.addEventListener('DOMContentLoaded', () => {
	// Get the container element
	const reactContainer = document.getElementById('react-component');

	if (reactContainer) {
		// Retrieve the client deployment parameter from the data-* attribute
		const svcDeployment = reactContainer.getAttribute('data-svc-deployment');

		// Pass the parameter to the React component as a prop
		const root = createRoot(reactContainer);
		root.render(<MiawChatV3 svcDeployment={svcDeployment} />);
	} else {
		console.error('React container element not found!');
	}
});
