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

exports.mapF = function(tasks, worker, parallelCnt) {
	let
		res = [],
		runningCnt = 0,
		nextTask = 0;

	parallelCnt = parallelCnt || 1;

	return new Promise((resolve, reject) => {
		const	f = () => {
			// rely on worker.then(f) to check this condition
			// instead of right after the while loop
			// to prevent resolving the promise before the worker is done.
			// This fixes parent promise misses the child promise rejection
			if (nextTask === tasks.length) {
				resolve(res);
			}

			while (runningCnt < parallelCnt && nextTask < tasks.length) {
				runningCnt += 1;

				worker(tasks[nextTask], nextTask)
					.then(
						((idx) => (data) => {
							res[idx] = data;
							runningCnt -= 1;
						})(nextTask++)
					)
					.then(f)
					.catch((ex) => {
						nextTask = tasks.length;
						reject(ex);
					});
			}
		};

		f();
	});
};
