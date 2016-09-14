'use strict';

const
	gulp = require('gulp'),
	prompt = require('gulp-prompt'),
	transform = require('gulp-transform'),
	rename = require('gulp-rename'),
	rm = require('gulp-rimraf'),
	runSequence = require('gulp-run-sequence'),
	fs = require('fs'),
	path = require('path'),
	childProcess = require('child_process');

var cache;

try {
	cache = require('./cache.json');
} catch(ex) {
	cache = {};
}

gulp.task('clean', function() {
	return gulp.src('./build/*').pipe(rm());
});

gulp.task('copy-functions', function() {
	return gulp
		.src('./functions/**')
		.pipe(gulp.dest('build/functions'));
});

gulp.task('copy-project-json', function() {
	return gulp
		.src('./project.json')
		.pipe(gulp.dest('build'));
});

gulp.task(
	'transform-config',
	['copy-project-json', 'copy-functions'],
	function() {
		var mem = require('./project.json').memory;

		return gulp
			.src('./build/**/function.json')
			.pipe(
				prompt.prompt(
					{
						type: 'input',
						name: 'executorRole',
						message: 'AWS Role for lambda execution (arn):',
						default: cache.executorRole
					},
					(result) => {
						cache.executorRole = result.executorRole;
					}
				)
			)
			.pipe(
				prompt.prompt(
					{
						type: 'input',
						name: 'stackName',
						message: 'AWS Cloud Formation Stack Name:',
						default: cache.stackName
					},
					(result) => {
						cache.stackName = result.stackName;
					}
				)
			)
			.pipe(
				prompt.prompt(
					{
						type: 'input',
						name: 'mem',
						message: 'Sheep C/D executor lambda memory size:',
						default: mem
					},
					(result) => {
						mem = result.mem;
					}
				)
			)
			.pipe(transform(
				(contents) => {
					let fnJson = JSON.parse(contents.toString());

					fnJson.role = cache.executorRole;
					fnJson.memory = mem;

					fnJson.environment = fnJson.environment || {};
					fnJson.environment.STACK_NAME = cache.stackName;

					return JSON.stringify(fnJson, ' ', 2);
				}
			))
			.pipe(gulp.dest('./build'));
	}
);

gulp.task('install-deps', function() {
	return gulp
		.src('./build/**/function.json')
		.pipe(transform(
			(contents, file) => {
				const
					fnJson = JSON.parse(contents.toString()),
					fnPath = path.join(
						'./build',
						file.relative.substring(
							0, file.relative.lastIndexOf('/')
						)
					);

				if (fnJson.dependencies && fnJson.dependencies.length) {
					const installed = fs.readdirSync('./node_modules/');

					childProcess.execSync(
						'mkdir -p ' + fnPath + '/node_modules/'
					);

					fnJson.dependencies.map((dep) => {
						let idx = installed.indexOf(dep);

						if (idx >= 0) {
							childProcess.execSync(
								'cp -r ./node_modules/' + dep + ' '
									+ fnPath + '/node_modules/' + dep
							);
						} else {
							throw new Error('Module not found: ' + dep);
						}
					})
				}

				return contents;
			}
		));
});

gulp.task('install-lib', function() {
	return gulp
		.src('./build/**/function.json')
		.pipe(transform(
			(contents, file) => {
				const
					fnJson = JSON.parse(contents.toString()),
					fnPath = path.join(
						'./build',
						file.relative.substring(
							0, file.relative.lastIndexOf('/')
						)
					);

				if (fnJson.lib && fnJson.lib.length) {
					childProcess.execSync(
						'mkdir -p ' + fnPath + '/lib/'
					);

					fnJson.lib.map((dep) => {
						childProcess.execSync(
							'cp -r ./lib/' + dep + ' '
								+ fnPath + '/lib/' + dep
						);
					});
				}

				return contents;
			}
		));
});

gulp.task('checkout-config', function() {
	return gulp
		.src('./build/functions/checkout/function.json')
		.pipe(
			prompt.prompt(
				{
					type: 'input',
					name: 'accessToken',
					message: 'github access token:',
					default: cache.accessToken
				},
				(result) => cache.accessToken = result.accessToken
			)
		)
		.pipe(transform(
			(contents) => {
				let fnJson = JSON.parse(contents.toString());

				fnJson.environment = fnJson.environment || {};
				fnJson.environment.GITHUB_ACCESS_TOKEN = cache.accessToken;
				fnJson.environment.S3_ROOT = 'sheepcd-s3root-' + cache.stackName;

				return JSON.stringify(fnJson, ' ', 2);
			}
		))
		.pipe(gulp.dest('./build/functions/checkout'));
});

gulp.task('save-config-cache', function() {
	fs.writeFileSync('./cache.json', JSON.stringify(cache, ' ', 2));
});

gulp.task('default', function() {
	runSequence(
		'clean',
		'transform-config', 'checkout-config',
		'install-deps', 'install-lib',
		'save-config-cache'
	);
});
