'use strict';

const
	AWS = require('aws-sdk'),
	fs = require('fs'),
	os = require('os'),
	path = require('path'),
	childProcess = require('child_process'),

	ARTI_PATH_PREFEX = 'sheep-artifects';

exports.handle = function(event, context, callback) {

	console.log(JSON.stringify(event.Records, ' ', 2));

	const
		gitEvent = JSON.parse(event.Records[0].Sns.Message),
		cwd = fs.mkdirSync(path.join(os.tmpdir(), ARTI_PATH_PREFEX));

	console.log(cwd);

	childProcess.exec(
		"ssh-agent bash -c 'ssh-add ./deployKey; git clone "
			+ gitEvent.repository.ssh_url
			+ "'",
		{
			cwd: cwd
		},
		(err, stdout, stderr) => {
			console.log(err);
			console.log(stdout);
			console.log(stderr);

			callback(null, '');
		}
	);

};
