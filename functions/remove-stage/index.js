'use strict';

const
	AWS = require('aws-sdk'),

	removeStage = require('./lib/manage/remove-stage');

exports.handle = function(event, context, callback) {

	removeStage(
		AWS,
		{
			s3Root: process.env.S3_ROOT,
			stackName: process.env.STACK_NAME,
			snsTopic: process.env.SNS_TOPIC
		},
		event
	).then((data) => {
		callback(null, data);
	}).catch(callback);

};
