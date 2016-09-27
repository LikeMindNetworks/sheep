'use strict';

const
	path = require('path'),
	fs = require('fs'),

	setupExecDir = require('./setup-execution-directory'),
	runCommand = require('./run-command'),
	ExecutionFailedError = require('./execution-error').ExecutionFailedError,

	s3Util = require('../utils/s3-util'),
	pathUtil = require('../utils/path-util');

module.exports = function(AWS, context, params) {

	const stageRoot = pathUtil.getStageRootForVersion(
		params.repo,
		params.pipeline,
		params.stage.name,
		params.commit,
		params.timestamp
	);

	let dirs;

	try {
		dirs = setupExecDir(
			params.repo,
			params.commit,
			params.reRun
		);

		console.log('Dirs = ', JSON.stringify(dirs));
	} catch(ex) {
		return new Promise((resolve, reject) => reject(ex));
	}

	console.log('Started src download');

	return s3Util
		.downloadDir( // copy source
			AWS,
			{
				localDir: dirs.src,
				s3Params: {
					Bucket: context.s3Root,
					Prefix: params.s3Path
				}
			}
		)
		.then(() => {
			console.log('Started npm install');

			return runCommand(0, 'npm install', dirs);
		})
		.then(() => {
			console.log('Uploading to s3');

			// load back to s3
			return s3Util.uploadDir(
				AWS,
				{
					localDir: dirs.src,
					s3Params: {
						Bucket: context.s3Root,
						Prefix: params.s3Path
					}
				}
			);
		})
		.then(() => {
			// reporting
			const report = JSON.stringify({
				tasks: 'upload to s3',
				resultCodes: [0]
			});

			fs.writeFileSync(path.join(dirs.reports, 'result.json'), report);

			console.log('Start to upload report');

			return s3Util
				.uploadDir(
					AWS,
					{
						localDir: dirs.reports,
						deleteRemoved: true,
						s3Params: {
							Bucket: context.s3Root,
							Prefix: path.join(stageRoot, 'reports')
						}
					}
				)
				.then(() => report);
		});

};
