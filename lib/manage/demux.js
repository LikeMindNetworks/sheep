'use strict';

const
	snsUtil = require('../utils/sns-util'),
	pathUtil = require('../utils/path-util'),
	getPipeline = require('../view/get-pipeline'),

	updateStageBuilds = require('./update-stage-builds'),
	ReOldBuildRunError = require('./management-error').ReOldBuildRunError;

module.exports = function(AWS, context, snsEvent) {

	const
		s3 = new AWS.S3(),
		lambda = new AWS.Lambda({
			apiVersion: '2015-03-31',
			{
				httpOptions: {
					timeout: 330 * 1000
				}
			}
		});

	let
		stageName,
		stage,
		lambdaEvent,
		status = 'STARTED',
		error;

	return getPipeline(
			AWS,
			{ stackName: context.stackName },
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

			snsEvent = Object.assign(
				snsEvent,
				{
					stage: stage
				}
			);
			lambdaEvent = JSON.stringify(snsEvent);

			return new Promise((resolve, reject) => s3.putObject(
				{
					Bucket: context.s3Root,
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
				{ stackName: context.stackName },
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
						FunctionName: context.stackName
							+ '_sheepcd_'
							+ stage.executor,
						Payload: lambdaEvent
					}
				);

				req.on('retry', (response) => {
					// NEVER RETRY THIS IS CONFUSING
					console.log('Prevent Retry');
					response.error.retryable = false;
					response.error.redirect = false;
				});

				req.send((err, data) => {
					if (err) {
						reject(err);
					} else {
						if (data.FunctionError) {
							reject(data.Payload ? JSON.parse(data.Payload) : data);
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

			if (ex.noMoreStage) {
				status = 'SUCCEED';
			} else if (ex instanceof ReOldBuildRunError) {
				status = ex.status;
			} else {
				status = 'FAILED';
			}

			error = ex;
		})
		.then(() => updateStageBuilds(
			AWS,
			{ stackName: context.stackName },
			{
				pipeline: snsEvent.pipeline,
				stage: stageName,
				commit: snsEvent.commit,
				timestamp: snsEvent.timestamp,
				status: status
			}
		))
		.then(() => {
			console.log([
				'Finished: [' + status + ']', snsEvent.pipeline,
				stageName, snsEvent.commit, snsEvent.timestamp,
				error ? error.message : ''
			].join(' '));

			// send message for next stage to run

			if (!error && stage.state === 'UNBLOCKED') {
				// if succeeded,
				// and is not blocked file sns event
				// to trigger next stage

				let message = Object.assign({}, snsEvent);

				message.eventName = 'stageFinished';
				message.prevStage = stageName;
				delete message.stage;

				return snsUtil.publish(
					AWS,
					{
						TopicArn: context.snsTopic,
						Message: JSON.stringify(message)
					}
				);
			} else if (error instanceof ReOldBuildRunError) {
				return {}; // this should prevent retry
			} else {
				throw error;
			}

		});

};
