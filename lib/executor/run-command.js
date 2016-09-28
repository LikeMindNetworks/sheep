'use strict';

const
	fs = require('fs'),
	path = require('path'),
	childProcess = require('child_process');

module.exports = (id, cmd, executionDirs) => {
	return new Promise((resolve, reject) => {
		id += '';

		let
			startTime = Date.now(),
			cmdPath = path.join(executionDirs.cmds, id),
			reportOut = fs.createWriteStream(path.join(executionDirs.reports, id));

		fs.writeFileSync(cmdPath, cmd, { mode: '0755' });

		let proc = childProcess.spawn(cmdPath, [], {
			cwd: executionDirs.src,
			env: Object.assign(
				process.env,
				{
					// change home, so that npm can run
					HOME: executionDirs.envHomeDir,
					CONFIG_PATH: path.join(executionDirs.cwd, 'config'),
					SHELL: '/bin/bash',
					PATH: process.env.PATH
						+ ':'
						+ path.resolve(
							__dirname,
							'..', '..',
							path.join('node_modules', 'nave')
						)
				}
			)
		});

		proc.stdout.on('data', (data) => reportOut.write(data));
		proc.stderr.on('data', (data) => reportOut.write(data));

		proc.on('error', reject);

		proc.on('close', (code, signal) => {
			let duration = Date.now() - startTime;

			if (signal) {
				reportOut.end(
					'\nEND WITH SIGNAL: ' + signal + ' in ' + duration + 'ms'
				);
				reject(signal);
			} else {
				reportOut.end(
					'\nRESULT CODE: ' + code + ' in ' + duration + 'ms'
				);
				resolve(code);
			}
		});
	});
};
