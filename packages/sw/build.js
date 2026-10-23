const esbuild = require('esbuild');
const locales = require('../../locales');
const meta = require('../../package.json');
const watch = process.argv[2]?.includes('watch');

console.log('Starting SW building...');

const options = {
	entryPoints: [ `${__dirname}/src/sw.ts` ],
	bundle: true,
	format: 'esm',
	treeShaking: true,
	minify: process.env.NODE_ENV === 'production',
	absWorkingDir: __dirname,
	outbase: `${__dirname}/src`,
	outdir: `${__dirname}/../../built/_sw_dist_`,
	loader: {
		'.ts': 'ts'
	},
	tsconfig: `${__dirname}/tsconfig.json`,
	define: {
		_VERSION_: JSON.stringify(meta.version),
		_LANGS_: JSON.stringify(Object.entries(locales).map(([k, v]) => [k, v._lang_])),
		_ENV_: JSON.stringify(process.env.NODE_ENV) ?? 'undefined',
		_DEV_: JSON.stringify(process.env.NODE_ENV !== 'production'),
		_PERF_PREFIX_: JSON.stringify('Misskey:'),
	},
};

(async () => {
	if (watch) {
		options.plugins = [{
			name: 'watch-status',
			setup(build) {
				build.onEnd(result => {
					if (result.errors.length) console.error('SW: watch build failed:', result.errors);
					else console.log('SW: watch build succeeded');
				});
			},
		}];
		const context = await esbuild.context(options);
		await context.watch();
		console.log('watching...');
	} else {
		const result = await esbuild.build(options);
		console.log('done,', JSON.stringify(result));
	}
})().catch(error => {
	console.error(error);
	process.exitCode = 1;
});
