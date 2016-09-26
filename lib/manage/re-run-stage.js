'use strict';

const
	snsUtil = require('../utils/sns-util.js'),
	getBuildConfig = require('./get-build-config');

/**
 * Resend the SNS event of the stage with retry flag
 *
 * @param repo
 * @param pipeline
 * @param stage
 * @param commit
 * @param commitTimestamp
 */
module.exports = function(AWS, context, params) {
	return new getBuildConfig(
		AWS,
		context,
		params
	)
		.then((config) => {
			const message = {
				reRun: true
			};

			message.eventName = config.eventName;
			message.pipeline = config.pipeline;
			message.timestamp = config.timestamp;
			message.commit = config.commit;
			message.commitMessage = config.commitMessage;
			message.commitUrl = config.commitUrl;
			message.author = config.author;
			message.repo = config.repo;
			message.s3Path = config.s3Path;

			return snsUtil.publish(
				AWS,
				{
					TopicArn: process.env.SNS_TOPIC,
					Message: JSON.stringify(message)
				}
			);
		});
};
