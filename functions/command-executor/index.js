'use strict';

const
	AWS = require('aws-sdk'),

	commandExec = require('./lib/executor/command-executor');

exports.handle = function(event, context, callback) {
	commandExec(AWS, { s3Root: process.env.S3_ROOT }, event)
		.then((report) => callback(null, report))
		.catch(callback)
};
