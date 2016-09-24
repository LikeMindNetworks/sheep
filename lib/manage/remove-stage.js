'use strict';

module.exports = function(AWS, context, params) {
	// generate hash key
	const
		ddb = new AWS.DynamoDB(),
		ddoc = new AWS.DynamoDB.DocumentClient(ddb),
		tableName = 'sheepcd-ddb-' + context.stackName,
		pipelineKey = 'pipeline:' + params.pipeline;

	const validateRemove = () => new Promise((resolve, reject) => {

		if (!params.pipeline || params.pipeline.indexOf('*') >= 0) {
			return reject(new Error('Missing or Invalid Pipeline'));
		}

		if (!params.stage || params.stage.indexOf('*') >= 0) {
			return reject(new Error('Missing or Invalid Stage'));
		}

		resolve();
	});

	const removeStage = () => new Promise((resolve, reject) => {
		ddoc.delete(
			{
				TableName: tableName,
				Key: { pipeline: pipelineKey, config: params.stage }
			},
			(err, data) => {
				if (err) {
					return reject(err);
				}

				resolve();
			}
		);
	});

	const removePipelineIfNeeded = () => new Promise((resolve, reject) => {
		ddoc.get(
			{
				TableName: tableName,
				Key: { pipeline: pipelineKey, config: '*' }
			},
			(err, data) => {
				if (err) {
					return reject(err);
				}

				let idx = data.Item.stages.indexOf(params.stage);

				if (idx >= 0) {
					if (data.Item.stages.length === 1) {
						ddoc.delete(
							{
								TableName: tableName,
								Key: { pipeline: pipelineKey, config: '*' }
							},
							(err, data) => {
								if (err) {
									return reject(err);
								}

								ddoc.get(
									{
										TableName: tableName,
										Key: { pipeline: 'pipeline:*', config: '*' }
									},
									(err, data) => {

										if (err) {
											return reject(err);
										}

										let pipelines = data.Item
											? data.Item.pipelines
											: {};

										delete pipelines[params.pipeline];

										ddoc.put(
											{
												TableName: tableName,
												Item: {
													pipeline: 'pipeline:*',
													config: '*',
													pipelines: pipelines
												}
											},
											(err, data) => {
												if (err) {
													reject(err);
												} else {
													resolve();
												}
											}
										);
									}
								);
							}
						);
					} else {
						data.Item.stages.splice(idx, 1);

						ddoc.put(
							{
								TableName: tableName,
								Item: data.Item
							},
							(err, data) => {
								if (err) {
									reject(err);
								} else {
									resolve();
								}
							}
						);
					}
				} else {
					resolve();
				}
			}
		);
	});

	return validateRemove().then(removeStage).then(removePipelineIfNeeded);
};
