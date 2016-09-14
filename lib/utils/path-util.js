'use strict';

exports.escapeRepoName = (repo) => repo.replace(/\//g, '-');

exports.getVersionIdentifier = (version, timestamp) => {
	return timestamp + '-' + version;
}

exports.getSourcePath = (repo, version, timestamp) => {
	return [
		exports.escapeRepoName(repo),
		'src',
		exports.getVersionIdentifier(version, timestamp)
	].join('/');
};

exports.getStageRoot = (repo, pipeline, stage, version, timestamp) => {
	return [
		exports.escapeRepoName(repo),
		pipeline,
		stage,
		exports.getVersionIdentifier(version, timestamp)
	].join('/');
};
