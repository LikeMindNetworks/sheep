'use strict';

const
	AWS = require('aws-sdk'),

	overview = require('./lib/report/overview');

exports.handle = function(event, context, callback) {

	overview(
		AWS,
		{
			stackName: process.env.STACK_NAME
		}
	).then(function(data) {
		callback(null, data)
	}).catch(function(ex) {
		callback(ex);
	});

};
