'use strict';

const
	s3 = require('s3'),
	fs = require('fs'),
	path = require('path'),
	glob = require('glob'),

	promiseUtil = require('./promise-util');

exports.downloadJSON = (AWS, params) => new Promise((resolve, reject) => {
	var awsS3 = new AWS.S3();

	awsS3.getObject(params, (err, data) => {
		if (err) {
			reject(err);
		} else {
			try {
				resolve(JSON.parse(data.Body.toString()));
			} catch(ex) {
				reject(ex);
			}
		}
	});
});

exports.downloadFile = (AWS, params) => {
	return new Promise((resolve, reject) => {
		const
			s3cli = s3.createClient({
				s3Client: new AWS.S3({})
			}),
			download = s3cli.downloadFile(params);

		download.on('error', reject);
		download.on('end', resolve);
	});
};

exports.downloadDir = (AWS, params) => {
	return new Promise((resolve, reject) => {
		const
			s3cli = s3.createClient({
				s3Client: new AWS.S3({})
			}),
			download = s3cli.downloadDir(params);

		download.on('error', reject);
		download.on('end', resolve);
	});
};

exports.uploadDir = (AWS, params) => {
	const files = glob.sync(
		path.join(params.localDir, '/**/*'),
		{ nodir: true }
	);

	return promiseUtil.map(files.map(
		(f) => new Promise((resolve, reject) => {
			console.log('STARTED UPLOAD: ' + f);

			new AWS.S3().upload(
				{
					Bucket: 'sheepcd-s3root-lmncd',
					Key: path.join(
						params.s3Params.Prefix,
						path.relative(params.localDir, f)
					),
					Body: fs.createReadStream(f)
				},
				(err, data) => {
					if (err) {
						console.log('FAILED UPLOAD: ' + f);
						reject(err);
					} else {
						console.log('OK UPLOAD: ' + f);
						resolve(data);
					}
				}
			);
		})
	));
};
