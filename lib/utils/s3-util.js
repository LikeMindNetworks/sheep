'use strict';

const s3 = require('s3');

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
