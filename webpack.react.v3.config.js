const path = require('path');

module.exports = {
	mode: 'development', // Use 'production' for production builds
	entry: './cartridges/custom_sfra_miaw/cartridge/client/default/react_v3/react-entry.js', // Entry point for React components
	output: {
		path: path.resolve(__dirname, 'cartridges/custom_sfra_miaw/cartridge/static/default/js'),
		filename: 'react-bundle-v3.js', // Output file for React components
	},
	module: {
		rules: [
			{
				test: /\.jsx?$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: ['@babel/preset-env', '@babel/preset-react'],
					},
				},
			},
			{
				test: /\.css$/,
				use: ['style-loader', 'css-loader'],
			},
		],
	},
	resolve: {
		extensions: ['.js', '.jsx'],
	},
};
