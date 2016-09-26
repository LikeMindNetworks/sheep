'use strict';

class ExecutionError extends Error {};

class ExecutionFailedError extends ExecutionError {

	constructor(command, code, reason) {
		super([
			'Failed to Execution Command: ', command,
			'Code: ', code,
			'Reason: ', reason
		].join(' '));

		this.command = command;
		this.code = code;
		this.reason = reason;
	}

};

exports.ExecutionError = ExecutionError;
exports.ExecutionFailedError = ExecutionFailedError;
