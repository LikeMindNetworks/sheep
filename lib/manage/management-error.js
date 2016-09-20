'use strict';

class PipelineManagementError extends Error {};

class ReOldBuildRunError extends PipelineManagementError {

	constructor(pipeline, stage, build, isReRun) {
		super([
				'Attempt to re-run an old build',
				pipeline, stage, build,
				isReRun
					? 'It is not the latest build'
					: ''
		].join(' '));

		this.pipeline = pipeline;
		this.stage = stage;
		this.build = build;
		this.isReRun = isReRun;
	}

};

exports.PipelineManagementError = PipelineManagementError;
exports.ReOldBuildRunError = ReOldBuildRunError;
