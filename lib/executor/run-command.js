'use strict';

const
	fs = require('fs'),
	path = require('path'),
	childProcess = require('child_process');

module.exports = (id, cmd, executionDirs) => {
	return new Promise((resolve, reject) => {
		id += '';

		let
			cmdPath = path.join(executionDirs.cmds, id),
			reportOut = fs.createWriteStream(path.join(executionDirs.reports, id));

		fs.writeFileSync(cmdPath, cmd, { mode: '0755' });

		let proc = childProcess.spawn(cmdPath, [], {
			cwd: executionDirs.src,
			env: process.env
		});

		proc.stdout.on('data', (data) => reportOut.write(data));
		proc.stderr.on('data', (data) => reportOut.write(data));

		proc.on('error', reject);

		proc.on('close', (code) => {
			reportOut.end('\nRESULT CODE: ' + code);
			resolve(code);
		});
	});
};
