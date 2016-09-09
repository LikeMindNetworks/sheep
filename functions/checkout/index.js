'use strict';

const
	AWS = require('aws-sdk'),
	fs = require('fs'),
	os = require('os'),
	path = require('path'),
	tar = require('tar-fs'),
	gunzip = require('gunzip-maybe'),
	https = require('follow-redirects').https,

	ARTI_PATH_PREFEX = 'sheep-artifects-';

exports.handle = function(event, context, callback) {

	const
		gitEvent = JSON.parse(event.Records[0].Sns.Message),
		cwd = path.join(os.tmpdir(), ARTI_PATH_PREFEX + Date.now());

	let req = https.request(
		{
			method: 'GET',
			hostname: 'api.github.com',
			path: '/repos/' + gitEvent.repository.full_name + '/tarball',
			headers: {
				'User-Agent': 'curl/7.50.0',
				Authorization: 'token ' + process.env.GITHUB_ACCESS_TOKEN
			}
		},
		(res) => {
			res.on('error', (err) => {
				callback(err, err.message);
			});

			fs.mkdirSync(cwd);

			const
				foutPath = path.join(cwd, 'archive.tar.gz'),
				fout = fs.createWriteStream(foutPath);

			res.pipe(fout);

			fout.on('finish', () => {
				if (res.statusCode === 200) {
					fs
						.createReadStream(foutPath)
						.pipe(gunzip())
						.pipe(tar.extract(cwd))
						.on('finish', function() {
							callback(null, cwd);
						});
				} else {
					callback(
						res.statusCode + ' '+ res.statusMessage,
						fs.readFileSync(foutPath).toString()
					);
				}
			});
		}
	);

	req.end();
	req.on('error', (err) => {
		callback(err, err.message);
	});

};
