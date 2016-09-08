'use strict';

exports.handle = function(event, context, callback) {

	console.log(JSON.stringify(event.Records[0].Sns));
	callback(null, 'abcdedf');

};
