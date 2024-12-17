'use strict';

var server = require('server');

server.get('Test', function (req, res, next) {
	res.render('miaw/test');
	next();
});

module.exports = server.exports();
