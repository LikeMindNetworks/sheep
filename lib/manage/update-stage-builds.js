'use strict';

/*
 * @param {Object} params
 * @param {String} params.pipeline - name of the pipeline
 * @param {String} params.stage - name of the stage
 * @param {String} params.commit
 * @param {String} params.timestamp
 * @param {String} params.status - SUCCEED | FAILED | STARTED
 */

const
	MAX_BUILDS_TRACKED = 30,
	pathUtil = require('../utils/path-util');

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

		stage.builds[versionIdentifier] = {
			status: params.status
		};

		// reverse sort
		let versions = Object.keys(stage.builds).sort((a, b) => {
			if (a > b) {
				return -1;
			}

			if (a < b) {
				return 1;
			}

			return 0
		});

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
