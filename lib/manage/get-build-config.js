'use strict';

const
	path = require('path'),
	pathUtil = require('../utils/path-util');

/**
 * Resend the SNS event of the stage with retry flag
 *
 * @param repo
 * @param pipeline
 * @param stage
 * @param commit
 * @param commitTimestamp
 */
module.exports = function(AWS, context, params) {
	const
		s3 = new AWS.S3(),
		stageRoot = pathUtil.getStageRootForVersion(
			params.repo,
			params.pipeline,
			params.stage,
			params.commit,
			params.commitTimestamp
		);

	return new Promise((resolve, reject) => {
		s3.getObject(
			{
				Bucket: context.s3Root,
				Key: path.join(stageRoot, 'config')
			},
			(err, data) => {
				if (err) {
					reject(err);
				} else {
					try {
						resolve(JSON.parse(data.Body.toString()));
					} catch(ex) {
						reject(ex);
					}
				}
			}
		);
	});
};
