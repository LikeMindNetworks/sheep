'use strict';

const
	AWS = require('aws-sdk'),
	fs = require('fs'),
	childProcess = require('child_process'),

	ARTI_PATH = './artifects';

exports.handle = function(event, context, callback) {

	const event = JSON.parse(event.Records[0].Sns.Message);

	// create cwd
	fs.mkdirSync(ARTI_PATH);

	childProcess.exec(
		"ssh-agent bash -c 'ssh-add ./deployKey; git clone "
			+ event.repository.ssh_url
			+ "'",
		{
			cwd: ARTI_PATH
		},
		(err, stdout, stderr) => {
			console.log(err);
			console.log(stdout);
			console.log(stderr);

			callback(null, '');
		}
	);

};
