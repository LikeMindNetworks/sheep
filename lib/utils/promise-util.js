'use strict';

exports.map = function(promises) {
	let res = [], error;

	for (let i = 0; i < promises.length; ++i) {
		if (
			!promises[i]
				|| (typeof promises[i].then !== 'function')
				|| (typeof promises[i].catch !== 'function')
		) {
			throw new Error('[' + i + ']th element is not a promise');
		}
	}

	return new Promise((resolve, reject) => {
		if (!promises.length) {
			resolve([]);
			return;
		}

		let resolvedCnt = 0;

		for (let i = 0; i < promises.length; ++i) {
			promises[i]
				.then((r) => {
					res[i] = r;

					if (++resolvedCnt === promises.length) {
						resolve(res);
					}
				})
				.catch(reject);
		}
	});
};
