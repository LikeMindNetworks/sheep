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

	getPipeline(
			AWS,
			{ stackName: process.env.STACK_NAME },
			snsEvent.pipeline
		)
		.then((pipeline) => {
			let stageName, stage;

			if (snsEvent.prevStage) {
				for (let i = 0; i < pipeline.stageOrder.length; ++i) {
					if (pipeline.stageOrder[i] === snsEvent.prevStage) {

						if (i === pipeline.stageOrder.length - 1) {
							// no more stages
							return callback(null, {});
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
				return callback(new Error('unknown stage: ' + stageName));
			}

			const lambdaEvent = JSON.stringify(Object.assign(
				snsEvent,
				{
					stage: stage
				}
			));

			// store the stage config used to ran this task
			s3.putObject(
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
					// call executor lambda synchronously

					console.log([
						'Starting:', snsEvent.pipeline,
						stageName, snsEvent.commit, snsEvent.timestamp
					].join(' '));

					updateStageBuilds(
						AWS,
						{ stackName: process.env.STACK_NAME },
						{
							pipeline: snsEvent.pipeline,
							stage: stageName,
							commit: snsEvent.commit,
							timestamp: snsEvent.timestamp,
							status: 'STARTED'
						}
					).then(
						() => new Promise(
							(resolve, reject) => lambda.invoke(
								{
									FunctionName: process.env.STACK_NAME
										+ '_sheepcd_'
										+ stage.executor,
									Payload: lambdaEvent
								},
								(err, data) => {
									console.log([
										'Finished:', snsEvent.pipeline,
										stageName, snsEvent.commit, snsEvent.timestamp,
										err ? err.message : ''
									].join(' '));

									if (err) {
										reject(err);
									} else {
										if (data.FunctionError) {
											reject(JSON.parse(data.Payload));
										} else {
											resolve(JSON.parse(data.Payload));
										}
									}
								}
							)
						)
					).then(
						() => updateStageBuilds(
							AWS,
							{ stackName: process.env.STACK_NAME },
							{
								pipeline: snsEvent.pipeline,
								stage: stageName,
								commit: snsEvent.commit,
								timestamp: snsEvent.timestamp,
								status: 'SUCCEED'
							}
						)
					).then(
						() => callback(null)
					).catch(
						(ex) => {
							console.log(ex);

							if (ex instanceof ReOldBuildRunError) {
								callback(null);
							} else {
								return updateStageBuilds(
									AWS,
									{ stackName: process.env.STACK_NAME },
									{
										pipeline: snsEvent.pipeline,
										stage: stageName,
										commit: snsEvent.commit,
										timestamp: snsEvent.timestamp,
										status: 'FAILED'
									}
								).catch((ex) => ex).then(callback);
							}
						}
					);
				}
			);
		})
		.catch(callback);

};
