'use strict';

var _templates = {};

window.getTemplate = function(templateName) {
	return new Promise(function(resolve, reject) {
		superagent.get('./templates/' + templateName).end(function(err, res) {
			if (err) {
				reject(err);
			} else {
				resolve(res.text);
			}
		});
	});
};

window.getTemplates = function(templateNames) {
	let
		cnt = templateNames.length,
		res = [];

	return new Promise(function(resolve, reject) {

		templateNames.map(function(templateName, idx) {
			if (_templates[templateName]) {
				res[idx] = _templates[templateName];
				cnt -= 1;

				if (cnt === 0) {
					resolve(res);
				}
			} else {
				window
					.getTemplate(templateName)
					.then(function(html) {
						res[idx] = _templates[templateName] = html;
						cnt -= 1;

						if (cnt === 0) {
							resolve(res);
						}
					})
					.catch(reject);
			}
		});

	});
};

window.parseQuery = function(qstr) {
	var
		query = {},
		a = qstr.split('&');

	for (var i = 0; i < a.length; i++) {
		var b = a[i].split('=');
		query[decodeURIComponent(b[0])] = decodeURIComponent(b[1] || '');
	}

	return query;
};

window.callLambda = function(functionName, payload) {
	var config = {
		region: _model.creds.region,
		credentials: new AWS.Credentials(
			_model.creds.accessKeyId,
			_model.creds.secretAccessKey
		)
	};

	AWS.config.update(config);

	if (window.isBusy) {
		return new Promise(function(resolve, reject) {
			reject(new Error('Client is Busy'));
		});
	}

	return new Promise(function(resolve, reject) {
		window.isBusy = true;

		try {
			const
				lambda = new AWS.Lambda({apiVersion: '2015-03-31'}),
				req = lambda.invoke(
					{
						FunctionName: _model.creds.stackName
							+ '_sheepcd_'
							+ functionName,
						Payload: JSON.stringify(payload || {})
					}
				);

			req.on('retry', function(response) {
				// NEVER RETRY THIS IS CONFUSING
				response.error.retryable = false;
			});

			req.send(function(err, data) {
				window.isBusy = false;

				if (err) {
					reject(err);
				} else {
					data = JSON.parse(data.Payload);

					if (data && data.errorMessage) {
						reject(data.errorMessage);
					} else {
						resolve(data);
					}
				}
			});
		} catch(ex) {
			window.isBusy = false;
		}
	});
};

window.render= function(template, data, partials) {
	var html = Mustache.render(
		template,
		data,
		partials
	);

	document.getElementById('view').innerHTML = html;
};

window.renderLoading = function() {
	render(
		'<div class="row row-p-b"><h2 class="col-lg-12">Loading...</h2></div>',
		_model.creds
	);
};

window.renderNotif = function(message, classes) {
	var html = Mustache.render(
		[
			'{{#message}}',
				'<div class="alert {{classes}}">',
					'{{message}}',
					'<div class="pull-right pointer" ',
						'onclick="renderError()">X</div>',
				'</div>',
			'{{/message}}'
		].join(''),
		{
			message: message,
			classes: classes
		}
	);

	document.getElementById('notif').innerHTML = html;
};

window.renderError = function(ex) {
	window.renderNotif(ex && ex.message || ex, 'alert-danger');
	ex && console.error(ex);
};

window.renderOK = function(message) {
	window.renderNotif(message, 'alert-success');
};
