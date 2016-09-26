'use strict';

const
	AWS = require('aws-sdk'),
	fs = require('fs'),
	s3 = require('s3'),
	path = require('path'),

	runCommand = require('./lib/executor/run-command'),
	setupExecDir = require('./lib/executor/setup-execution-directory'),

	pathUtil = require('./lib/utils/path-util'),
	s3Util = require('./lib/utils/s3-util');

exports.handle = function(event, context, callback) {
};
