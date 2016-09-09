'use strict';

const
	AWS = require('aws-sdk'),
	fs = require('fs'),
	childProcess = require('child_process'),

	ARTI_PATH_PREFEX = './sheep-artifects';

exports.handle = function(event, context, callback) {

	const
		gitEvent = JSON.parse(event.Records[0].Sns.Message),
		cwd = fs.mkdtempSync(ARTI_PATH_PREFEX);

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
