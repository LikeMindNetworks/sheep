'use strict';

const
	AWS = require('aws-sdk'),

	demux = require('./lib/manage/demux');

exports.handle = function(event, context, callback) {
	demux(
		AWS,
		{
			s3Root: process.env.S3_ROOT,
			stackName: process.env.STACK_NAME,
			snsTopic: process.env.SNS_TOPIC
		},
		JSON.parse(event.Records[0].Sns.Message)
	)
		.then((data) => callback(null, data))
		.catch(callback)
};
