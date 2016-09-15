'use strict';

const s3 = require('s3');

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
	return new Promise((resolve, reject) => {
		const
			s3cli = s3.createClient({
				s3Client: new AWS.S3({})
			}),
			upload = s3cli.uploadDir(params);

		upload.on('error', reject);
		upload.on('end', resolve);
	});
};
