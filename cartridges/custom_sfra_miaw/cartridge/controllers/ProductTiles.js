'use strict';

var server = require('server');

server.get('GetJson', function (req, res, next) {
	var ProductSearchModel = require('dw/catalog/ProductSearchModel');
	var ArrayList = require('dw/util/ArrayList');

	var output = {};

	var idsParam = req.querystring.ids;
	// Ensure we have valid input and split it into an array
	var productIds = idsParam
		? idsParam.split(',').map(function (id) {
				return id.trim();
		  })
		: [];
	if (productIds.length === 0) {
		output = { status: 'error', errorMessage: 'No product IDs provided.' };
		res.json(output);
		return next();
	}

	var productIdsArrayList = new ArrayList(productIds);
	var apiProductSearch = new ProductSearchModel();
	// Max 30 IDs supported in setProductIDs
	apiProductSearch.setProductIDs(productIdsArrayList.slice(0, 30));

	apiProductSearch.search();

	// Extract results
	var productSearchHits = apiProductSearch.getProductSearchHits();
	var results = [];

	while (productSearchHits.hasNext()) {
		var hit = productSearchHits.next();
		var product = hit.getProduct();
		results.push({
			id: product.getID(),
			name: product.getName(),
			imageUrl: product.getImage('medium').getAbsURL().toString(),
			productUrl: product.getCustom().kieProductUrl,
			price: product.getPriceModel().getPrice().valueOrNull,
			available: product.isAvailable(),
		});
	}

	output = {
		status: 'success',
		products: results,
	};

	// Set CORS headers
	res.setHttpHeader('Access-Control-Allow-Origin', 'https://aperelgritz.github.io');
	res.setHttpHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
	res.setHttpHeader('Access-Control-Allow-Headers', 'Content-Type');

	res.json(output);

	return next();
});

module.exports = server.exports();
