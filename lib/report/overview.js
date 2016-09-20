'use strict';

const
	fs = require('fs'),

	promiseUtil = require('../utils/promise-util'),
	pathUtil = require('../utils/path-util'),
	s3Util = require('../utils/s3-util'),
	getAllPipelines = require('../view/get-all-pipelines'),
	getPipeline = require('../view/get-pipeline');

/*
 * @param {Object} Overview
 *
 * @param {Object[]} pipelines
 * @param {String} pipelines[].name
 * @param {String} pipelines[].repo
 * @param {Object[]} pipelines[].stages

 * @param {String} pipelines[].stages[].name
 * @param {Object[]} pipelines[].stages[].lastFive
 * @param {String} pipelines[].stages[].state - BLOCKED | UNBLOCKED

 * @param {String} pipelines[].stages[].lastFive[].commit
 * @param {String} pipelines[].stages[].lastFive[].commitMessage
 * @param {String} pipelines[].stages[].lastFive[].commitUrl
 * @param {Number} pipelines[].stages[].lastFive[].commitTimestamp
 * @param {String} pipelines[].stages[].lastFive[].author
 * @param {String} pipelines[].stages[].lastFive[].status
 * 	- SUCCEED | RUNNING | FAILED
 */

exports.renderHTML = function(AWS, context, params) {
	const template = fs.readFileSync(
		__dirname + '/static/overview.html'
	).toString();

	return exports
		.renderJSON(AWS, context, params)
		.then(
			(data) => template
				+ '\n<script>render(' + JSON.stringify(data) + ')</script>'
		);
};

exports.renderJSON = function(AWS, context, params) {
	// pull from

	return getAllPipelines(AWS, context)
		.then((pipelineMap) => {
			const pipelineNames = Object.keys(pipelineMap);

			return promiseUtil
				.map(
					pipelineNames.map(
						(pipelineName) => renderPipeline(AWS, context, pipelineName)
					)
				)
				.then(
					(rendered) => rendered.sort((a, b) => {
						if (a.name > b.name) {
							return 1;
						} else if (a.name < b.name) {
							return -1;
						} else {
							return 0;
						}
					})
				);
		});
};

const renderPipeline = function(AWS, context, pipelineName) {
	return getPipeline(AWS, context, pipelineName)
		.then((pipeline) => {
			return promiseUtil.map(
				pipeline.stageOrder.map(
					(s) => renderStage(
						AWS,
						Object.assign(context, { pipeline: pipeline }),
						pipeline.stages[s]
					)
				)
			).then((stages) => {
				return {
					name: pipeline.name,
					repo: pipeline.repo,
					stages: stages
				}
			})
		});
};

const renderStage = function(AWS, context, stage) {
	const
		ddb = new AWS.DynamoDB(),
		ddoc = new AWS.DynamoDB.DocumentClient(ddb),
		tableName = 'sheepcd-ddb-' + context.stackName,
		pipelineKey = 'pipeline:' + context.pipeline.name,
		builds = Object
			.keys(stage.builds)
			.sort((a, b) => {
				if (a > b) {
					return -1;
				}

				if (a < b) {
					return 1;
				}

				return 0
			})
			.slice(0, 5)
			.map((v) => {
				return {
					versionIdentifier: v,
					status: stage.builds[v]
				}
			});

	return promiseUtil
		.map(
			builds.map((build) => renderBuild(
				AWS, Object.assign(context, { stage: stage }), build
			))
		)
		.then(
			(renderedBuilds) => {
				return {
					name: stage.name,
					state: stage.state,
					lastFive: renderedBuilds
				};
			}
		);
};

const renderBuild = function(AWS, context, build) {
	return new Promise((resolve, reject) => {
		const s3 = new AWS.S3();

		s3.getObject(
			{
				Bucket: process.env.S3_ROOT,
				Key: pathUtil.getStageRoot(
					context.pipeline.repo,
					context.pipeline.name,
					context.stage.name
				) + '/' + build.versionIdentifier + '/config'
			},
			(err, data) => {
				if (err) {
					return reject(err);
				}

				const config = JSON.parse(data.Body.toString());

				resolve({
					commit: config.commit,
					commitMessage: config.commitMessage || '',
					commitUrl: config.commitUrl || 'javascript:void(0)',
					commitTimestamp: parseInt(config.timestamp, 10),
					author: config.author || {},
					status: build.status.status
				});
			}
		);
	});
};
