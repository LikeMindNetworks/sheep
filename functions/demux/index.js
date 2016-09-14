'use strict';

const
	AWS = require('aws-sdk'),

	pathUtil = require('./lib/utils/util'),
	getPipeline = require('./lib/view/get-pipeline');

exports.handle = function(event, context, callback) {

	const
		s3 = new AWS.S3(),
		lambda = new AWS.Lambda({apiVersion: '2015-03-31'}),
		snsEvent = JSON.parse(event.Records[0].Sns.Message);

	getPipeline(
			AWS,
			{ stackName: process.env.STACK_NAME },
			snsEvent.pipeline
		)
		.then((pipelines) => {
			let
				stageName = snsEvent.stage || pipelines.stageOrder[0],
				stage = pipelines.stages[stageName];

			if (!stage) {
				return callback(new Error('unknown stage'));
			}

			// store the stage config used to ran this task
			s3.putObject(
				{
					Bucket: process.env.S3_ROOT,
					Key: [
						pathUtil.getStageRoot(
							snsEvent.repo,
							snsEvent.pipeline,
							stageName,
							snsEvent.commit
						),
						'config'
					].join('/'),
					Body: JSON.stringify({
						event: snsEvent,
						stage: stage
					})
				},
				(err, data) => {
					// call executor lambda synchronously
					callback(err, data);
				}
			);
		})
		.catch((ex) => {
			callback(ex);
		});

};
