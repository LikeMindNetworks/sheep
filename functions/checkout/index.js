'use strict';

const
	AWS = require('aws-sdk'),
	fs = require('fs'),
	os = require('os'),
	path = require('path'),
	github = require('github'),

	ARTI_PATH_PREFEX = 'sheep-artifects';

exports.handle = function(event, context, callback) {

	const
		gitEvent = JSON.parse(event.Records[0].Sns.Message),
		cwd = fs.mkdirSync(path.join(os.tmpdir(), ARTI_PATH_PREFEX));

	github.authenticate({
		type: 'oauth',
		token: process.env.GITHUB_ACCESS_TOKEN
	});

	github.repos.getArchiveLink(
		{
			user: '',
			repo: ''
		},
		(err, res) => {
			if (err) {
				callback(err);
			} else {
				console.log(res);

				callback(null, '');
			}
		}
	);

};
