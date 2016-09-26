'use strict';

const
	AWS = require('aws-sdk'),

	buildDetails = require('./lib/report/build-details'),
	overview = require('./lib/report/overview');

exports.handle = function(event, context, callback) {

	const ctx = {
		s3Root: process.env.S3_ROOT,
		stackName: process.env.STACK_NAME,
		snsTopic: process.env.SNS_TOPIC
	};

	switch(event.reportType) {
		case 'build-details':
			return buildDetails(
				AWS,
				ctx,
				{
					repo: event.repo,
					pipeline: event.pipeline,
					stage: event.stage,
					versionIdentifier: event.versionIdentifier
				}
			).then(function(data) {
				callback(null, data);
			}).catch(function(ex) {
				callback(ex);
			});
		case 'overview':
		default:
			return overview(
				AWS,
				ctx
			).then(function(data) {
				callback(null, data)
			}).catch(function(ex) {
				callback(ex);
			});
	}

};
