'use strict';

exports.handle = function(event, context, callback) {

	console.log(JSON.stringify(event.Sns));
	callback(null, 'abcdedf');

};
