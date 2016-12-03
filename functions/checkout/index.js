'use strict';

const
	AWS = require('aws-sdk'),
	fs = require('fs'),
	os = require('os'),
	path = require('path'),
	tar = require('tar-fs'),
	gunzip = require('gunzip-maybe'),
	https = require('follow-redirects').https,

	s3Util = require('./lib/utils/s3-util'),
	snsUtil = require('./lib/utils/sns-util'),
	pathUtil = require('./lib/utils/path-util'),
	promiseUtil = require('./lib/utils/promise-util'),

	getPipelinesForRepo = require('./lib/view/get-pipelines-for-repo'),
	getPipeline = require('./lib/view/get-pipeline'),

	ARTI_PATH_PREFEX = 'sheep-artifects-';

exports.handle = function(event, context, callback) {

	const
		gitEvent = JSON.parse(event.Records[0].Sns.Message),
		cwd = path.join(os.tmpdir(), ARTI_PATH_PREFEX + Date.now()),
		downloadedRepos = {},
		ctx = {
			s3Root: process.env.S3_ROOT,
			stackName: process.env.STACK_NAME,
			snsTopic: process.env.SNS_TOPIC
		};

	getPipelinesForRepo(
		AWS,
		ctx,
		gitEvent.repository.full_name
	)
	.then((pipelines) => {
		const
			timestamp = new Date(
				gitEvent.head_commit.timestamp
			).getTime() + '',
			s3Path = pathUtil.getSourcePath(
				gitEvent.repository.full_name,
				gitEvent.after,
				timestamp
			);

		return promiseUtil.map(pipelines.map((pipeline) => {

			return getPipeline(
				AWS,
				ctx,
				pipeline
			).then((pipelineConfig) => new Promise((resolve, reject) => {
				// check out source

				if (gitEvent.ref !== pipelineConfig.gitRef) {
					// skip, branch mismatch
					return resolve(false);
				}

				if (downloadedRepos[gitEvent.repository.full_name]) {
					return resolve(true);
				}

				try {
					if (fs.statSync(cwd).isDirectory()) {
						// multiple pipelines on the same repo and branch
						return resolve(true);
					}
				} catch(ex) {
				}

				console.log(
					'Pulling GitHub: ' + gitEvent.repository.full_name
						+ ' token: ' + pipelineConfig.repoAccessToken.substring(0, 4)
						+ '*****'
				);

				const req = https.request(
					{
						method: 'GET',
						hostname: 'api.github.com',
						path: '/repos/'
							+ gitEvent.repository.full_name
							+ '/tarball/'
							+ gitEvent.after,
						headers: {
							'User-Agent': 'curl/7.50.0',
							Authorization: 'token ' + pipelineConfig.repoAccessToken
						}
					},
					(res) => {
						res.on('error', reject);

						fs.mkdirSync(cwd);

						const
							foutPath = path.join(cwd, 'archive.tar.gz'),
							fout = fs.createWriteStream(foutPath);

						res.pipe(fout);

						fout.on('error', reject);

						fout.on('finish', () => {
							if (res.statusCode === 200) {
								downloadedRepos[gitEvent.repository.full_name] = true;

								let unpack = fs
									.createReadStream(foutPath)
									.pipe(gunzip())
									.pipe(tar.extract(cwd));

								unpack.on('error', reject);

								unpack.on('finish', () => {
									// check for existence of un-tar-ed src
									// TODO: this is uglu, just use git binary
									// and deploy key in the future

									let dir;

									try {
										dir = fs
											.readdirSync(cwd)
											.filter((d) => d !== 'archive.tar.gz')[0];

										console.log('Folder to be uploaded: ' + dir);
									} catch(ex) {
										return reject(ex);
									}

									s3Util
										.uploadDir(
											AWS,
											{
												localDir: path.join(cwd, dir),

												s3Params: {
													Bucket: process.env.S3_ROOT,
													Prefix: s3Path
												}
											}
										)
										.then(resolve)
										.catch(reject);
								});
							} else {
								reject(res.statusCode + ' '+ res.statusMessage);
							}
						});
					}
				);

				req.end();
				req.on('error', reject);
			})).then((shouldRun) => shouldRun && snsUtil.publish( // send sns event
				AWS,
				{
					TopicArn: process.env.SNS_TOPIC,
					Message: JSON.stringify({
						eventName: 'checkout',
						pipeline: pipeline,
						timestamp: timestamp,
						commit: gitEvent.after,
						commitMessage: gitEvent.head_commit
							&& gitEvent.head_commit.message
							|| '',
						commitUrl: gitEvent.head_commit.url,
						author: gitEvent.head_commit
							&& gitEvent.head_commit.author,
						repo: gitEvent.repository.full_name,
						s3Path: s3Path
					})
				}
			));

		}));
	})
	.then((res) => callback(null, res))
	.catch(callback);

};
