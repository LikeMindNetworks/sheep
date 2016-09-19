'use strict';

module.exports = function(AWS, context) {
	// generate hash key
	const
		ddb = new AWS.DynamoDB(),
		ddoc = new AWS.DynamoDB.DocumentClient(ddb),
		tableName = 'sheepcd-ddb-' + context.stackName;

	return new Promise((resolve, reject) => ddoc.get(
		{
			TableName: tableName,
			Key: { pipeline: 'pipeline:*', config: '*' }
		},
		(err, data) => {

			if (err) {
				return reject(err);
			}

			let pipelines = data.Item ? data.Item.pipelines : {};

			resolve(pipelines);
		}
	));
};
