'use strict';

exports.getSourcePath = (repo, version, timestamp) => {
	return [repo, 'src', timestamp + '-' + version].join('/');
};

exports.getStageRoot = (repo, pipeline, stage, version) => {
	return [repo, pipeline, stage, version].join('/');
};
