'use strict';

var server = require('server');

server.get('Start', function (req, res, next) {
	res.render('miaw/chat');
	next();
});

server.get('StartV3', function (req, res, next) {
	res.render('miaw/chat_v3');
	next();
});

module.exports = server.exports();
