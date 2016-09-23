'use strict';

/*
 * @param {String} params.pipeline - name of the pipeline
 * @param {String} params.stage - name of the stage
 * @param {String} params.state - BLOCKED | UNBLOCKED
 */

module.exports = function(AWS, context, params) {
	// generate hash key
	const
		ddb = new AWS.DynamoDB(),
		ddoc = new AWS.DynamoDB.DocumentClient(ddb),
		tableName = 'sheepcd-ddb-' + context.stackName,
		pipelineKey = 'pipeline:' + params.pipeline;

	if (params.state !== 'BLOCKED' && params.state !== 'UNBLOCKED') {
		return reject(new Error('params.state must be BLOCKED or UNBLOCKED'));
	}

	return new Promise((resolve, reject) => {
		ddoc.update(
			{
				TableName: tableName,
				Key: { pipeline: pipelineKey, config: params.stage },
				UpdateExpression: 'SET #s = :t',
				ConditionExpression: '#s = :c',
				ExpressionAttributeNames: {
					'#s': 'state'
				},
				ExpressionAttributeValues: {
					':t': params.state,
					':c': params.state === 'BLOCKED' ? 'UNBLOCKED' : 'BLOCKED'
				}
			},
			(err, data) => {
				if (err) {
					reject(err);
				} else {
					resolve(data);
				}
			}
		);
	});
};
