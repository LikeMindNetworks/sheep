'use strict';

exports.publish = function(AWS, params) {
	const sns = new AWS.SNS();

	return new Promise((resolve, reject) => {
		sns.publish(
			params,
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
