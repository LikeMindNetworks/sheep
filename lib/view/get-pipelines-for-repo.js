'use strict';

module.exports = function(AWS, context, repo) {
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

			resolve(
				Object
					.keys(pipelines)
					.map((name) => {
						if (pipelines[name] === repo) {
							return name;
						}
					})
					.filter((x) => !!x)
			);
		}
	));
};
