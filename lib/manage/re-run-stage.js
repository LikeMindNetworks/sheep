'use strict';

const
	snsUtil = require('../utils/sns-util.js'),
	getPipeline = require('../view/get-pipeline'),
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
	return getPipeline(
		AWS,
		context,
		params.pipeline
	)
		.then((pipelineConfig) => {
			return getBuildConfig(
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

					const stages = pipelineConfig.stageOrder || [];
					message.prevStage = stages[stages.indexOf(params.stage) - 1];

					return message.prevStage && snsUtil.publish(
						AWS,
						{
							TopicArn: context.snsTopic,
							Message: JSON.stringify(message)
						}
					);
				});
		});

};
