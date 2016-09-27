'use strict';

class PipelineManagementError extends Error {};

class ReOldBuildRunError extends PipelineManagementError {

	constructor(pipeline, stage, build, isReRun, status) {
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
		this.status = status;
	}

};

exports.PipelineManagementError = PipelineManagementError;
exports.ReOldBuildRunError = ReOldBuildRunError;
