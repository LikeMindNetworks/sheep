'use strict';

const DATA_ROOT = 'data';

exports.escapeRepoName = (repo) => repo.replace(/\//g, '-');

exports.getVersionIdentifier = (version, timestamp) => {
	return timestamp + '-' + version;
}

exports.getSourcePath = (repo, version, timestamp) => {
	return [
		DATA_ROOT,
		exports.escapeRepoName(repo),
		'src',
		exports.getVersionIdentifier(version, timestamp)
	].join('/');
};

exports.getStageRootForVersion = (repo, pipeline, stage, version, timestamp) => {
	return [
		DATA_ROOT,
		exports.escapeRepoName(repo),
		pipeline,
		stage,
		exports.getVersionIdentifier(version, timestamp)
	].join('/');
};

exports.getStageRoot = (repo, pipeline, stage) => {
	return [
		DATA_ROOT,
		exports.escapeRepoName(repo),
		pipeline,
		stage
	].join('/');
};
