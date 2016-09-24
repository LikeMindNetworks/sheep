'use strict';

const
	AWS = require('aws-sdk'),

	updateStage = require('./lib/manage/update-stage');

exports.handle = function(event, context, callback) {

	updateStage(
		AWS,
		{
			stackName: process.env.STACK_NAME
		},
		event
	).then((data) => {
		callback(null, data);
	}).catch(callback);

};
