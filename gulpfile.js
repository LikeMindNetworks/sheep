'use strict';

const
	gulp = require('gulp'),
	prompt = require('gulp-prompt'),
	transform = require('gulp-transform'),
	rm = require('gulp-rimraf'),
	runSequence = require('gulp-run-sequence');

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
	'transform',
	['copy-project-json', 'copy-functions'],
	function() {
		var
			executorRole,
			mem = require('./project.json').memory;

		return gulp
			.src('./build/**/function.json')
			.pipe(
				prompt.prompt(
					{
						type: 'input',
						name: 'executorRole',
						message: 'AWS Role for lambda execution (arn): '
					},
					function(result) {
						executorRole = result.executorRole;
					}
				)
			)
			.pipe(
				prompt.prompt(
					{
						type: 'input',
						name: 'mem',
						message: 'Sheep C/D executor lambda memory size (Mb): ',
						default: mem
					},
					function(result) {
						mem = result.mem;
					}
				)
			)
			.pipe(transform(
				function(contents) {
					let fnJson = JSON.parse(contents.toString());

					fnJson.role = executorRole;
					fnJson.memory = mem;

					return JSON.stringify(fnJson);
				}
			))
			.pipe(gulp.dest('build'));
	}
);

gulp.task('default', function() {
	runSequence('clean', 'transform');
});
