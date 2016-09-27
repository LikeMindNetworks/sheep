'use strict';

const
	AWS = require('aws-sdk'),

	npmInstallExec = require('./lib/executor/npm-install-executor');

exports.handle = function(event, context, callback) {
	npmInstallExec(
		AWS,
		{
			s3Root: process.env.S3_ROOT,
			stackName: process.env.STACK_NAME,
			snsTopic: process.env.SNS_TOPIC
		},
		event
	)
		.then((report) => callback(null, report))
		.catch(callback)
};
