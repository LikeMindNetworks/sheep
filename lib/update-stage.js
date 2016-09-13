'use strict';

/*
 * @param {Object} AWS
 *
 * @param {Object} context
 * @param {Object} context.stackName
 *
 * @param {Object} params
 * @param {String} params.pipeline - name of the pipeline
 * @param {String} params.stage - name of the stage
 * @param {String} params.action - REMOVE | UPDATE
 *
 * @param {Integer} params.order - insert stage at this position
 * @param {String} params.state - BLOCKED | UNBLOCKED
 *
 * @param {Object[]} params.configs - array of configurations for this stage
 * @param {Object} params.configs[i] - an individul config
 * @param {String} params.configs[i].name - name of the config
 * @param {String} params.configs[i].type - type of the config JSON | String
 * @param {String} params.configs[i].value - string value of this config
 *
 * @param {String} params.executor - executor name
 * @param {String[]} params.cmds - commands to run
 *
 * @param {Function} callback
 */
module.exports = function(AWS, context, params, callback) {

	// validation
	if (!params.pipeline) {
		callback(new Error('Missing Pipeline'));
	}

	if (!params.stage) {
		callback(new Error('Missing Stage'));
	}

	if (params.action !== 'REMOVE' && params.action !== 'UPDATE') {
		callback(new Error('Invalid action must be REMOVE or UPDATE'));
	}

	if (params.order && (typeof params.order !== 'number')) {
		callback(new Error('params.order must be a number'));
	}

	if (
		params.state
			&& params.state !== 'BLOCKED'
			&& params.state !== 'UNBLOCKED'
	) {
		callback(new Error('params.state must be BLOCKED or UNBLOCKED'));
	}

	// generate hash key
	const
		ddb = new AWS.DynamoDB(),
		hkey = 'pipline:' + params.pipeline + ':config';

	// pull pipeline
	ddb.getItem(
		{
			TableName: 'sheepcd-ddb-' + context.stackName,
			Key: { S: hkey }
		},
		(err, data) => {
			// pull stage
			console.log(err);
		}
	);
};
