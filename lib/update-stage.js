'use strict';

/*
 * Model:
 * <hashkey> <sortkey> <data>
 * pipeline:* * <list of pipelines>
 * pipeline:<pipeline name> * PipelineConfig
 * pipeline:<pipeline name> <stage name> StateConfig
 *
 * PipelineConfig:
 * - name
 * - repo
 * - stages: [<stage names>]
 *
 * StateConfig:
 * - name
 * - executor
 * - state
 * - vars
 */

/*
 * @param {Object} AWS
 *
 * @param {Object} context
 * @param {Object} context.stackName
 *
 * @param {String} params.action - REMOVE | UPDATE
 * @param {Integer} params.order - insert stage at this position
 *
 * @param {Object} params
 * @param {String} params.pipeline - name of the pipeline
 * @param {String} params.stage - name of the stage
 * @param {String} params.repo - full name of the repository
 *
 * @param {String} params.state - BLOCKED | UNBLOCKED
 *
 * @param {Object[]} params.vars - array of variables for this stage
 * @param {Object} params.vars[i] - an individul config
 * @param {String} params.vars[i].name - name of the config
 * @param {String} params.vars[i].type - type of the config JSON | String
 * @param {String} params.vars[i].value - string value of this config
 *
 * @param {String} params.executor - executor name
 *
 * @param {Function} callback
 */
module.exports = function(AWS, context, params) {
	// generate hash key
	const
		ddb = new AWS.DynamoDB(),
		ddoc = new AWS.DynamoDB.DocumentClient(ddb),
		tableName = 'sheepcd-ddb-' + context.stackName,
		pipelineKey = 'pipeline:' + params.pipeline;

	// REMOVE

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

				if (
					data.Item.stages.indexOf(params.stage) >= 0
						&& data.Item.stages.length === 1
				) {
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

									let pipelines = data.Item ? data.Item.pipelines : {};

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
					resolve();
				}
			}
		);
	});

	// UPDATE

	const validateUpdate = () => new Promise((resolve, reject) => {

		// action validation

		if (typeof params.order !== 'number') {
			return reject(new Error('params.order must be a number'));
		}

		// pipeline validation

		if (!params.pipeline || params.pipeline.indexOf('*') >= 0) {
			return reject(new Error('Missing or Invalid Pipeline'));
		}

		if (!params.repo) {
			return reject(new Error('Missing Repo'));
		}

		// stage validation

		if (!params.stage || params.stage.indexOf('*') >= 0) {
			return reject(new Error('Missing or Invalid Stage'));
		}

		if (params.state !== 'BLOCKED' && params.state !== 'UNBLOCKED') {
			return reject(new Error('params.state must be BLOCKED or UNBLOCKED'));
		}

		if (!params.vars) {
			return reject(new Error('Missing vars'))
		}

		if (!params.executor) {
			return reject(new Error('Missing Executor'));
		}

		resolve();
	});

	// fetch the pipeline
	const getPipeline = () => new Promise((resolve, reject) => {
		ddoc.get(
			{
				TableName: tableName,
				Key: { pipeline: pipelineKey, config: '*' }
			},
			(err, data) => {

				if (err) {
					return reject(err);
				}

				if (!data.Item) {
					// creating new pipeline
					// check for required fields

				}

				resolve({
					pipeline: Object.assign(
						data.Item || {
							stages: []
						},
						{
							pipeline: pipelineKey,
							config: '*',

							name: params.pipeline,
							repo: params.repo
						}
					)
				});
			}
		);
	});

	const getStage = (ctx) => new Promise((resolve, reject) => {
		ddoc.get(
			{
				TableName: tableName,
				Key: { pipeline: pipelineKey, config: params.stage }
			},
			(err, data) => {

				if (err) {
					return reject(err);
				}

				ctx.stage = Object.assign(
					data.Item || {},
					{
						pipeline: pipelineKey,
						config: params.stage,

						name: params.stage,
						state: params.state,
						executor: params.executor,
						vars: params.vars
					}
				);

				if (ctx.pipeline.stages.indexOf(params.stage) >= 0) {
					ctx.pipeline.stages.splice(
						ctx.pipeline.stages.indexOf(params.stage),
						1
					);
				}

				ctx.pipeline.stages.splice(params.order, 0, params.stage);
				ctx.pipeline.stages = ctx.pipeline.stages.filter((x) => !!x);

				resolve(ctx);
			}
		);
	});

	const putStage = (ctx) => new Promise((resolve, reject) => {
		ddoc.put(
			{
				TableName: tableName,
				Item: ctx.stage
			},
			(err, data) => {
				if (err) {
					reject(err);
				} else {
					resolve(ctx);
				}
			}
		);
	});

	const putPipeline = (ctx) => new Promise((resolve, reject) => {
		ddoc.put(
			{
				TableName: tableName,
				Item: ctx.pipeline
			},
			(err, data) => {
				if (err) {
					reject(err);
				} else {
					resolve(ctx);
				}
			}
		);
	});

	const regPipeline = (ctx) => new Promise((resolve, reject) => {
		ddoc.get(
			{
				TableName: tableName,
				Key: { pipeline: 'pipeline:*', config: '*' }
			},
			(err, data) => {

				if (err) {
					return reject(err);
				}

				ddoc.put(
					{
						TableName: tableName,
						Item: {
							pipeline: 'pipeline:*',
							config: '*',
							pipelines: Object.assign(
								data.Item ? data.Item.pipelines : {},
								{
									[params.pipeline]: pipelineKey
								}
							)
						}
					},
					(err, data) => {
						if (err) {
							reject(err);
						} else {
							resolve(ctx);
						}
					}
				);
			}
		);
	});

	switch(params.action) {
		case 'REMOVE':
			return validateRemove()
				.then(removeStage)
				.then(removePipelineIfNeeded);
		case 'UPDATE':
			return validateUpdate()
				.then(getPipeline)
				.then(getStage)
				.then(putStage)
				.then(putPipeline)
				.then(regPipeline);
		default:
			return new Promise(
				(resolve, reject) => reject(
					new Error('Invalid action must be REMOVE or UPDATE')
				)
			);
	}

};
