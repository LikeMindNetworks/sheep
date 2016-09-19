'use strict';

const
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
 * @param {Object[]} pipelines[].stages

 * @param {String} pipelines[].stages[].name
 * @param {Object[]} pipelines[].stages[].lastFive
 * @param {String} pipelines[].stages[].state - BLOCKED | UNBLOCKED

 * @param {String} pipelines[].stages[].lastFive[].commit
 * @param {String} pipelines[].stages[].lastFive[].commitMessage
 * @param {Number} pipelines[].stages[].lastFive[].commitTimestamp
 * @param {Number} pipelines[].stages[].lastFive[].updateTimestamp
 * @param {String} pipelines[].stages[].lastFive[].state
 * 	- SUCCEED | RUNNING | FAILED
 */

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
				)
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
					stages: stages
				}
			})
		});
};

const renderStage = function(AWS, context, stage) {
	const s3 = new AWS.S3();

	return new Promise((resolve, reject) => {
		const s3Prefix = pathUtil.getStageRoot(
			context.pipeline.repo,
			context.pipeline.name,
			stage.name
		) + '/';

		s3.listObjectsV2(
			{
				Bucket: process.env.S3_ROOT,
				Prefix: s3Prefix,
				Delimiter: '/',
				MaxKeys: 5 // list last 5 builds
			},
			(err, data) => {
				if (err) {
					return reject(err);
				}

				console.log(data);

				let builds = data.Contents
					.filter(
						(obj) => /.+reports\/status\.json/.test(obj.Key)
					)
					.map(
						(obj) => {
							console.log(obj);

							const
								tmp = obj.Key.split('/'),
								versionIdentifier = tmp[tmp.length - 3].split('-'),
								commit = versionIdentifier[1],
								commitTimestamp = parseInt(versionIdentifier[0], 10);

							return {
								commit: commit,
								commitTimestamp: commitTimestamp,
								statusKey: obj.Key,
								updateTimestamp: new Date(obj.LastModified).getTime()
							};
						}
					)
					.sort((a, b) => b.commitTimestamp - a.commitTimestamp);

				return promiseUtil
					.map(
						builds.map((build) => renderBuild(AWS, context, build))
					)
					.then(
						(renderedBuilds) => resolve({
							name: stage.name,
							state: stage.state,
							lastFive: renderedBuilds
						})
					);
			}
		);
	});
};

const renderBuild = function(AWS, context, build) {
	return new Promise((resolve, reject) => {
		const s3 = new AWS.S3();

		s3.getObject(
			{
				Bucket: process.env.S3_ROOT,
				Key: build.statusKey
			},
			(err, data) => {
				if (err) {
					return reject(err);
				}

				resolve({});
				// resolve(JSON.parse(data.Body.toString()));
			}
		);
	});
};
