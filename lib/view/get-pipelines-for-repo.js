'use strict';

const getAllPipelines = require('./get-all-pipelines');

module.exports = function(AWS, context, repo) {
	return getAllPipelines(AWS, context)
		.then(
			(pipelines) => Object
				.keys(pipelines)
				.map((name) => {
					if (pipelines[name] === repo) {
						return name;
					}
				})
				.filter((x) => !!x)
		);
};
