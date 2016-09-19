'use strict';

const
	AWS = require('aws-sdk'),
	s3 = require('s3'),
	path = require('path'),
	childProcess = require('child_process'),

	runCommand = require('./lib/executor/run-command'),
	setupExecDir = require('./lib/executor/setup-execution-directory'),

	pathUtil = require('./lib/utils/path-util'),
	s3Util = require('./lib/utils/s3-util');

exports.handle = function(event, context, callback) {
	const
		cmds = event.stage.vars.cmds,
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
	} catch(ex) {
		return callback(ex);
	}

	s3Util
		.downloadDir( // copy source
			AWS,
			{
				localDir: dirs.src,
				s3Params: {
					Bucket: process.env.S3_ROOT,
					Prefix: event.s3Path
				}
			}
		)
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

			return run();
		})
		.then((resCode) => {
			if (resCode !== 0) {
				// failed
				callback(null, dirs.reports);
			} else if (event.stage.state === 'UNBLOCKED') {
				// if succeeded,
				// and is not blocked file sns event
				// to trigger next stage

				let message = event;

				message.eventName = 'stageFinished';
				message.prevStage = event.stage.name;
				delete message.stage;

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
					.then(() => sns.publish(
						{
							TopicArn: process.env.SNS_TOPIC,
							Message: JSON.stringify(message)
						},
						(err, data) => {
							if (err) {
								callback(err);
							} else {
								callback(null, dirs.reports);
							}
						}
					));
			}

			// if succeeded, and is blocked do nothing
		})
		.catch(callback);
};
