'use strict';

const
	AWS = require('aws-sdk'),

	buildDetails = require('./lib/report/build-details'),
	overview = require('./lib/report/overview');

exports.handle = function(event, context, callback) {

	switch(event.reportType) {
		case 'build-details':
			return buildDetails(
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
		case 'overview':
		default:
			return overview(
				AWS,
				{
					stackName: process.env.STACK_NAME
				}
			).then(function(data) {
				callback(null, data)
			}).catch(function(ex) {
				callback(ex);
			});
	}

};
