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
		{
			dot: true,
			nodir: true
		}
	);

	return promiseUtil.mapF(
		files,
		(f) => new Promise((resolve, reject) => {
			new AWS.S3().upload(
				{
					Bucket: params.s3Params.Bucket,
					Key: path.join(
						params.s3Params.Prefix,
						path.relative(params.localDir, f)
					),
					Body: fs.createReadStream(f)
				},
				(err, data) => {
					if (err) {
						reject(err);
					} else {
						resolve(data);
					}
				}
			);
		}),
		50
	);
};
