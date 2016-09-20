'use strict';

const
	AWS = require('aws-sdk'),

	buildDetails = require('./lib/report/build-details');

exports.handle = function(event, context, callback) {

	buildDetails.renderHTML(
		AWS,
		{
			stackName: process.env.STACK_NAME
		},
		{
			repo: event.params.querystring.repo,
			pipeline: event.params.querystring.pipeline,
			stage: event.params.querystring.stage,
			versionIdentifier: event.params.querystring.versionIdentifier
		}
	).then(function(html) {
		callback(null, html)
	}).catch(function(ex) {
		callback(ex);
	});

};
