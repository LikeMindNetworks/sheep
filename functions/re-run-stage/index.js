'use strict';

const
	AWS = require('aws-sdk'),

	reRunStage = require('./lib/manage/re-run-stage');

exports.handle = function(event, context, callback) {
	reRunStage(AWS, context, event)
		.then((data) => {
			callback(null, data);
		})
		.catch(callback);
};
