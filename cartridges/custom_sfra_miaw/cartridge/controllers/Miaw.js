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

server.get('StartV4', function (req, res, next) {
	res.render('miaw/chat_v4');
	next();
});

server.get('StartV5', function (req, res, next) {
	res.render('miaw/chat_v5');
	next();
});

server.get('StartV6', function (req, res, next) {
	res.render('miaw/chat_v6');
	next();
});

module.exports = server.exports();
