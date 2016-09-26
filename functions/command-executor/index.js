'use strict';

const
	AWS = require('aws-sdk'),
	fs = require('fs'),
	s3 = require('s3'),
	path = require('path'),

	runCommand = require('./lib/executor/run-command'),
	setupExecDir = require('./lib/executor/setup-execution-directory'),
	ExecutionFailedError = require(
		'./lib/executor/execution-error'
	).ExecutionFailedError,

	pathUtil = require('./lib/utils/path-util'),
	s3Util = require('./lib/utils/s3-util');

exports.handle = function(event, context, callback) {
	const
		cmds = event.stage.vars.cmds.slice(0),
		stageRoot = pathUtil.getStageRootForVersion(
			event.repo,
			event.pipeline,
			event.stage.name,
			event.commit,
			event.timestamp
		),
		sns = new AWS.SNS();

	// should i run
	if (!cmds || cmds.length === 0) {
		return callback(new Error('No command(cmds) to run'));
	}

	console.log('Commit = ' + event.commit);

	let
		dirs,
		i = 0,
		resultCodes = [];

	try {
		dirs = setupExecDir(
			event.repo,
			event.commit,
			event.reRun
		);

		console.log('Dirs = ', JSON.stringify(dirs));
	} catch(ex) {
		return callback(ex);
	}

	s3Util
		.downloadFile(
			AWS,
			{
				localFile: path.join(dirs.cwd, 'config'),
				s3Params: {
					Bucket: process.env.S3_ROOT,
					Key: path.join(stageRoot, 'config')
				}
			}
		)
		.then(() => s3Util.downloadDir( // copy source
			AWS,
			{
				localDir: dirs.src,
				s3Params: {
					Bucket: process.env.S3_ROOT,
					Prefix: event.s3Path
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
				tasks: event.stage.vars.cmds,
				resultCodes: resultCodes
			});

			fs.writeFileSync(path.join(dirs.reports, 'result.json'), report);

			return s3Util
				.uploadDir(
					AWS,
					{
						localDir: dirs.reports,
						s3Params: {
							Bucket: process.env.S3_ROOT,
							Prefix: path.join(stageRoot, 'reports')
						}
					}
				)
				.then(() => {
					console.log('Result Codes = ' + resultCodes);
					console.log('Final Code = ' + resCode);
					console.log('Stage = ', JSON.stringify(event.stage));

					if (resCode !== 0) {
						throw new ExecutionFailedError(
							event.stage.vars.cmds.join(';'),
							resCode
						);
					} else {
						return report;
					}
				});
		})
		.then((report) => {
			callback(null, report);
		})
		.catch(callback);
};
