'use strict';

/*
 * @param {Object} params
 * @param {String} params.pipeline - name of the pipeline
 * @param {String} params.stage - name of the stage
 * @param {String} params.commit
 * @param {String} params.timestamp
 * @param {String} params.status - SUCCEED | FAILED | STARTED
 * @param {String} params.reRun
 */

const
	MAX_BUILDS_TRACKED = 30,
	pathUtil = require('../utils/path-util'),
	ReOldBuildRunError = require('./management-error').ReOldBuildRunError;

const sortBuildsByVersion = function(builds) {
	return Object.keys(builds).sort((a, b) => {
		if (a > b) {
			return -1;
		}

		if (a < b) {
			return 1;
		}

		return 0
	});
};

module.exports = function(AWS, context, params) {
	const
		ddb = new AWS.DynamoDB(),
		ddoc = new AWS.DynamoDB.DocumentClient(ddb),
		tableName = 'sheepcd-ddb-' + context.stackName,
		pipelineKey = 'pipeline:' + params.pipeline,
		versionIdentifier = pathUtil.getVersionIdentifier(
			params.commit, params.timestamp
		);

	return new Promise((resolve, reject) => ddoc.get(
		{
			TableName: tableName,
			Key: {
				pipeline: pipelineKey,
				config: params.stage
			}
		},
		(err, data) => {
			if (err) {
				reject(err);
			} else {
				resolve(data.Item);
			}
		}
	)).then((stage) => {
		if (!stage.builds) {
			stage.builds = {};
		}

		let versions = sortBuildsByVersion(stage.builds);

		if (params.status === 'STARTED' && stage.builds[versionIdentifier]) {
			// restarting an old build
			if (params.reRun) {
				if (versions.indexOf(versionIdentifier) !== 0) {
					throw new ReOldBuildRunError(
						params.pipeline,
						params.stage,
						versionIdentifier,
						params.reRun,
						stage.builds[versionIdentifier].status
					);
				} else {
					// allow re-run of latest build
				}
			} else {
				throw new ReOldBuildRunError(
					params.pipeline,
					params.stage,
					versionIdentifier,
					params.reRun,
					stage.builds[versionIdentifier].status
				);
			}
		}

		stage.builds[versionIdentifier] = {
			status: params.status
		};

		// reverse sort
		versions = sortBuildsByVersion(stage.builds);

		if (versions.length > MAX_BUILDS_TRACKED) {
			versions = versions.slice(0, MAX_BUILDS_TRACKED);

			stage.builds = versions.reduce(
				(builds, version) => {
					builds[version] = stage.builds[version];

					return builds;
				},
				{}
			);
		}

		return new Promise((resolve, reject) => ddoc.put(
			{
				TableName: tableName,
				Item: stage
			},
			(err, data) => {
				if (err) {
					reject(err);
				} else {
					resolve(data);
				}
			}
		));
	});
};
