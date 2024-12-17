import React, { useState } from 'react';

const AccessToken = () => {
	const [accessToken, setAccessToken] = useState(null);
	const [error, setError] = useState(null);

	const fetchAccessToken = async () => {
		try {
			console.log('fetching access token...');
			const response = await fetch(
				'https://rcg-ido-spring24.my.salesforce-scrt.com/iamessage/api/v2/authorization/unauthenticated/access-token',
				{
					method: 'POST',
					mode: 'cors',
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
				}
			);

			if (!response.ok) {
				console.log(`Response error while fetching access token: ${response.statusText}`);
				throw new Error(`Error: ${response.statusText}`);
			}

			const data = await response.json();
			console.log(`data object: ${data}`);
			setAccessToken(data.accessToken);
			localStorage.setItem('accessToken', data.accessToken);
		} catch (err) {
			console.log(`Error while fetching access token: ${err.message}`);
			setError(err.message);
		}
	};

	return (
		<div>
			<button onClick={fetchAccessToken}>Get Access Token</button>
			{accessToken && <p>Access Token: {accessToken}</p>}
			{error && <p style={{ color: 'red' }}>Error: {error}</p>}
		</div>
	);
};

export default AccessToken;
