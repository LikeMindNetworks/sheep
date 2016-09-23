'use strict';

const
	AWS = require('aws-sdk'),

	getLatestSuccessfulBuild = require('./lib/view/get-latest-successful-build'),
	updateStageState = require('./lib/manage/update-stage-state');

exports.handle = function(event, context, callback) {

	updateStageState(
		AWS,
		{
			stackName: process.env.STACK_NAME
		},
		{
			pipeline: event.pipeline,
			stage: event.stage,
			state: event.state
		}
	).then(function(data) {
		if (event.state === 'BLOCKED') {
			// blocked
			return;
		}

		return getLatestSuccessfulBuild(
			AWS,
			{
				stackName: process.env.STACK_NAME
			},
			event.repo,
			event.pipeline,
			event.stage
		).then((build) => {
			const
				sns = new AWS.SNS(),
				message = Object.assign(
					build,
					{
						eventName: 'stageFinished',
						prevStage: event.stage
					}
				);

			sns.publish(
				{
					TopicArn: process.env.SNS_TOPIC,
					Message: JSON.stringify(message)
				},
				(err, data) => {
					if (err) {
						callback(err);
					} else {
						callback(null, build);
					}
				}
			);
		});
	}).catch(callback);

};
