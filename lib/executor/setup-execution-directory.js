'use strict';

const
	fs = require('fs'),
	os = require('os'),
	path = require('path'),
	rimraf = require('rimraf'),
	pathUtil = require('../utils/path-util');

module.exports = function(repo, commit, clean) {
	const
		cwd = path.join(
			os.tmpdir(),
			pathUtil.escapeRepoName(repo) + '-' + commit
		),
		srcDir = path.join(cwd, 'src'),
		reportsDir = path.join(cwd, 'reports'),
		cmdsDir = path.join(cwd, 'cmds'),
		envHomeDir = path.join(cwd, 'home');

	try {
		let stat = fs.statSync(cwd);

		// file exists
		if (clean) {
			rimraf.sync(cwd);
		} else {
			return {
				cwd: cwd,
				src: srcDir,
				reports: reportsDir,
				cmds: cmdsDir
			};
		}
	} catch(ex) {
		if (ex.code !== 'ENOENT') {
			throw ex;
		}
	}

	fs.mkdirSync(cwd);
	fs.mkdirSync(srcDir);
	fs.mkdirSync(reportsDir);
	fs.mkdirSync(cmdsDir);
	fs.mkdirSync(envHomeDir);

	return {
		cwd: cwd,
		src: srcDir,
		reports: reportsDir,
		cmds: cmdsDir,
		envHomeDir: envHomeDir
	};
};
