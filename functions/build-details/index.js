'use strict';

const
	AWS = require('aws-sdk'),

	buildDetails = require('./lib/report/build-details');

exports.handle = function(event, context, callback) {

	buildDetails(
		AWS,
		{
			stackName: process.env.STACK_NAME
		},
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

};
