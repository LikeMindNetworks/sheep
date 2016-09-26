'use strict';

const
	path = require('path'),
	s3Util = require('../utils/s3-util'),
	pathUtil = require('../utils/path-util');

module.exports = function(AWS, context, repo, pipeline, stage) {
	// generate hash key
	const
		ddb = new AWS.DynamoDB(),
		ddoc = new AWS.DynamoDB.DocumentClient(ddb),
		tableName = 'sheepcd-ddb-' + context.stackName,
		pipelineKey = 'pipeline:' + pipeline;

	return new Promise((resolve, reject) => ddoc.get(
		{
			TableName: tableName,
			Key: { pipeline: pipelineKey, config: stage }
		},
		(err, data) => {

			if (err) {
				return reject(err);
			}

			const builds = Object
				.keys(data.Item.builds)
				.sort((a, b) => {
					if (a > b) {
						return -1;
					}

					if (a < b) {
						return 1;
					}

					return 0
				})
				.filter((b) => data.Item.builds[b].status === 'SUCCEED');

			if (builds.length) {
				const
					lastSuccessfulBuild = builds[0],
					configPath = path.join(
						pathUtil.getStageRoot(
							repo,
							pipeline,
							stage
						),
						lastSuccessfulBuild,
						'config'
					);

				return s3Util.downloadJSON(
					AWS,
					{
						Bucket: context.s3Root,
						Key: configPath
					}
				)
					.then((config) => {
						delete config.stage.builds;
						delete config.eventName;
						delete config.prevStage;

						resolve(config);
					})
					.catch(reject);
			} else {
				resolve(null);
			}
		}
	));
};
