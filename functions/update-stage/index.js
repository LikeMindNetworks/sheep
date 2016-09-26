'use strict';

const
	AWS = require('aws-sdk'),

	updateStage = require('./lib/manage/update-stage');

exports.handle = function(event, context, callback) {

	updateStage(
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
