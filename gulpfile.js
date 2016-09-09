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
		var
			executorRole = cache.executorRole,
			mem = require('./project.json').memory;

		return gulp
			.src('./build/**/function.json')
			.pipe(
				prompt.prompt(
					{
						type: 'input',
						name: 'executorRole',
						message: 'AWS Role for lambda execution (arn):',
						default: executorRole
					},
					(result) => {
						cache.executorRole = executorRole = result.executorRole;
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

					fnJson.role = executorRole;
					fnJson.memory = mem;

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
					childProcess.execSync(
						'npm install --prefix='
							+ fnPath
							+ ' '
							+ fnJson.dependencies.join(' ')
					);
				}

				return contents;
			}
		));
});

gulp.task('github-access-token', function() {
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
		'transform-config', 'github-access-token',
		'install-deps',
		'save-config-cache'
	);
});
