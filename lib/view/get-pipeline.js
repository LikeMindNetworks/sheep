'use strict';

module.exports = function(AWS, context, pipeline) {
	// generate hash key
	const
		ddb = new AWS.DynamoDB(),
		ddoc = new AWS.DynamoDB.DocumentClient(ddb),
		tableName = 'sheepcd-ddb-' + context.stackName;

	return new Promise((resolve, reject) => ddoc.query(
		{
			TableName: tableName,
			KeyConditionExpression: 'pipeline = :hkey',
			ExpressionAttributeValues: {
				':hkey': 'pipeline:' + pipeline
			}
		},
		(err, data) => {

			if (err) {
				return reject(err);
			}

			const
				stages = data.Items.reduce(
					(m, d) => { m[d.config] = d; delete d['config']; return m; },
					{}
				),
				pipeline = stages['*'];

			delete stages['*'];

			pipeline.stageOrder = pipeline.stages;
			pipeline.stages = stages;

			resolve(pipeline);
		}
	));
};
