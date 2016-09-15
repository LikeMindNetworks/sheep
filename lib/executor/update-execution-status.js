'use strict';

const
	fs = require('fs'),
	path = require('path'),

	s3Util = require('../utils/s3-util');

module.exports = function(AWS, stageRoot, executionDirs, status) {
	fs.writeFileSync(
		path.join(executionDirs.reports, 'status.json'),
		JSON.stringify({ status: status })
	);

	return s3Util.uploadDir(
		AWS,
		{
			localDir: executionDirs.reports,
			s3Params: {
				Bucket: process.env.S3_ROOT,
				Prefix: path.join(stageRoot, 'reports')
			}
		}
	);
};
