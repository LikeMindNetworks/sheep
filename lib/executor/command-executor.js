'use strict'

const
	path = require('path'),
	fs = require('fs'),
	os = require('os'),
	rimraf = require('rimraf'),

	setupExecDir = require('./setup-execution-directory'),
	runCommand = require('./run-command'),
	ExecutionFailedError = require('./execution-error').ExecutionFailedError,

	s3Util = require('../utils/s3-util'),
	pathUtil = require('../utils/path-util');

module.exports = function(AWS, context, params) {
	const
		cmds = params.stage.vars.cmds.slice(0),
		stageRoot = pathUtil.getStageRootForVersion(
			params.repo,
			params.pipeline,
			params.stage.name,
			params.commit,
			params.timestamp
		);

	// should i run
	if (!cmds || cmds.length === 0) {
		return new Promise(
			(resolve, reject) => reject(new Error('No command(cmds) to run'))
		);
	}

	console.log('Commit = ' + params.commit);

	let
		dirs,
		i = 0,
		resultCodes = [];

	try {
		if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
			// clear tmp folder if in LAMBDA
			rimraf.sync(path.join(os.tmpdir(), '*'));
			console.log('Clean out /tmp');
		}

		dirs = setupExecDir(
			params.repo,
			params.commit,
			params.reRun
		);

		console.log('Dirs = ', JSON.stringify(dirs));
	} catch(ex) {
		return new Promise((resolve, reject) => reject(ex));
	}

	return s3Util
		.downloadFile(
			AWS,
			{
				localFile: path.join(dirs.cwd, 'config'),
				s3Params: {
					Bucket: context.s3Root,
					Key: path.join(stageRoot, 'config')
				}
			}
		)
		.then(() => s3Util.downloadDir( // copy source
			AWS,
			{
				localDir: dirs.src,
				s3Params: {
					Bucket: context.s3Root,
					Prefix: params.s3Path
				}
			}
		))
		.then(() => {
			let run = () => {
				let cmdline = cmds.shift();

				if (cmdline) {
					return runCommand(i, cmdline, dirs)
						.then((code) => {
							resultCodes.push(code);

							++i;
							return run();
						});
				} else {
					return resultCodes.reduce((s, c) => s + c, 0);
				}
			};

			return run().catch((ex) => ex);
		})
		.then((resCode) => {
			const report = JSON.stringify({
				tasks: params.stage.vars.cmds,
				resultCodes: resultCodes
			});

			fs.writeFileSync(path.join(dirs.reports, 'result.json'), report);

			return s3Util
				.uploadDir(
					AWS,
					{
						localDir: dirs.reports,
						s3Params: {
							Bucket: context.s3Root,
							Prefix: path.join(stageRoot, 'reports')
						}
					}
				)
				.then(() => {
					console.log('Result Codes = ' + resultCodes);
					console.log('Final Code = ' + resCode);
					console.log('Stage = ', JSON.stringify(params.stage));

					if (resCode !== 0) {
						throw new ExecutionFailedError(
							params.stage.vars.cmds.join(';'),
							resCode
						);
					} else {
						return report;
					}
				});
		});
};
