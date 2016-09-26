'use strict';

const
	AWS = require('aws-sdk'),

	pathUtil = require('./lib/utils/path-util'),
	getPipeline = require('./lib/view/get-pipeline'),

	updateStageBuilds = require('./lib/manage/update-stage-builds'),
	ReOldBuildRunError = require(
		'./lib/manage/management-error'
	).ReOldBuildRunError;

exports.handle = function(event, context, callback) {

	const
		s3 = new AWS.S3(),
		lambda = new AWS.Lambda({apiVersion: '2015-03-31'}),
		snsEvent = JSON.parse(event.Records[0].Sns.Message);

	let
		stageName,
		stage,
		lambdaEvent,
		status = 'STARTED',
		error;

	getPipeline(
			AWS,
			{ stackName: process.env.STACK_NAME },
			snsEvent.pipeline
		)
		.then((pipeline) => {
			// select the stage

			if (snsEvent.prevStage) {
				for (let i = 0; i < pipeline.stageOrder.length; ++i) {
					if (pipeline.stageOrder[i] === snsEvent.prevStage) {

						if (i === pipeline.stageOrder.length - 1) {
							// no more stages
							throw { noMoreStage: true };
						} else {
							stageName = pipeline.stageOrder[i + 1];
							break;
						}
					}
				}
			} else {
				stageName = pipeline.stageOrder[0];
			}

			stage = pipeline.stages[stageName];

			if (!stage) {
				throw new Error('unknown stage: ' + stageName);
			}
		})
		.then(() => {
			// store the stage config used to ran this task

			lambdaEvent = JSON.stringify(Object.assign(
				snsEvent,
				{
					stage: stage
				}
			));

			return new Promise((resolve, reject) => s3.putObject(
				{
					Bucket: process.env.S3_ROOT,
					Key: [
						pathUtil.getStageRootForVersion(
							snsEvent.repo,
							snsEvent.pipeline,
							stageName,
							snsEvent.commit,
							snsEvent.timestamp
						),
						'config'
					].join('/'),
					Body: lambdaEvent,
					ContentType: 'application/json'
				},
				(err, data) => {
					if (err) {
						reject(err);
					} else {
						resolve(data);
					}
				}
			));
		})
		.then(() => {
			// starting

			console.log([
				'Starting:', snsEvent.pipeline,
				stageName, snsEvent.commit, snsEvent.timestamp
			].join(' '));

			return updateStageBuilds(
				AWS,
				{ stackName: process.env.STACK_NAME },
				{
					pipeline: snsEvent.pipeline,
					stage: stageName,
					commit: snsEvent.commit,
					timestamp: snsEvent.timestamp,
					status: status,
					reRun: snsEvent.reRun || false
				}
			);
		})
		.then(() => {
			// call executor lambda synchronously

			return new Promise((resolve, reject) => {
				const req = lambda.invoke(
					{
						FunctionName: process.env.STACK_NAME
							+ '_sheepcd_'
							+ stage.executor,
						Payload: lambdaEvent
					}
				);

				req.on('retry', (response) => {
					// NEVER RETRY THIS IS CONFUSING
					response.error.retryable = false;
				});

				req.send((err, data) => {
					console.log([
						'Finished:', snsEvent.pipeline,
						stageName, snsEvent.commit, snsEvent.timestamp,
						err ? err.message : ''
					].join(' '));

					if (err) {
						reject(err);
					} else {
						if (data.FunctionError) {
							reject(
								data.Payload
									? JSON.parse(data.Payload)
									: data
							);
						} else {
							resolve(JSON.parse(data.Payload));
						}
					}
				});
			});
		})
		.then(() => {
			// execution successful
			status = 'SUCCEED';
		})
		.catch((ex) => {
			// execution failed

			if (ex.noMoreStage || ex instanceof ReOldBuildRunError) {
				status = 'SUCCEED';
			} else {
				status = 'FAILED';
			}

			error = ex;
		})
		.then(() => updateStageBuilds(
			AWS,
			{ stackName: process.env.STACK_NAME },
			{
				pipeline: snsEvent.pipeline,
				stage: stageName,
				commit: snsEvent.commit,
				timestamp: snsEvent.timestamp,
				status: status
			}
		))
		.then(() => {
			// send message for next stage to run

			console.log(stage);
			console.log(error);

			if (!error && stage.state === 'UNBLOCKED') {
				// if succeeded,
				// and is not blocked file sns event
				// to trigger next stage

				let message = lambdaEvent;

				message.eventName = 'stageFinished';
				message.prevStage = stageName;
				delete message.stage;

				console.log(message);

				sns.publish(
					{
						TopicArn: process.env.SNS_TOPIC,
						Message: JSON.stringify(message)
					},
					(err, data) => {
						if (err) {
							callback(err);
						} else {
							callback(null, message.eventName);
						}
					}
				);
			} else {
				callback(error);
			}

		});

};
