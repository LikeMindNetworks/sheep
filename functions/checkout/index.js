'use strict';

exports.handle = function(event, context, callback) {

	console.log(event);
	callback(null, 'abcdedf');

};
