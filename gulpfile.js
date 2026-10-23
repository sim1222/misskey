/**
 * Gulp tasks
 */

const fs = require('fs');
const gulp = require('gulp');
const replace = require('gulp-replace');
const terser = require('gulp-terser');
const postcss = require('gulp-postcss');
const cssnano = require('cssnano');

const locales = require('./locales');
const meta = require('./package.json');

gulp.task('copy:backend:views', () =>
	gulp.src('./packages/backend/src/server/web/views/**/*').pipe(gulp.dest('./packages/backend/built/server/web/views'))
);

gulp.task('copy:backend:manifest', () =>
	gulp.src('./packages/backend/src/server/web/manifest.json').pipe(gulp.dest('./packages/backend/built/server/web'))
);

gulp.task('copy:client:fonts', () =>
	gulp.src('./packages/client/node_modules/three/examples/fonts/**/*', { encoding: false }).pipe(gulp.dest('./built/_client_dist_/fonts/'))
);

gulp.task('copy:client:fontawesome', () =>
	gulp.src('./packages/client/node_modules/@fortawesome/fontawesome-free/**/*', { encoding: false }).pipe(gulp.dest('./built/_client_dist_/fontawesome/'))
);

gulp.task('copy:client:locales', cb => {
	fs.mkdirSync('./built/_client_dist_/locales', { recursive: true });

	const v = { '_version_': meta.version };

	for (const [lang, locale] of Object.entries(locales)) {
		fs.writeFileSync(`./built/_client_dist_/locales/${lang}.${meta.version}.json`, JSON.stringify({ ...locale, ...v }), 'utf-8');
	}

	cb();
});

gulp.task('build:backend:script', () => {
	return gulp.src(['./packages/backend/src/server/web/boot.js', './packages/backend/src/server/web/bios.js', './packages/backend/src/server/web/cli.js'])
		.pipe(replace('LANGS', JSON.stringify(Object.keys(locales))))
		.pipe(terser({
			toplevel: true
		}))
		.pipe(gulp.dest('./packages/backend/built/server/web/'));
});

gulp.task('build:backend:style', () => {
	return gulp.src(['./packages/backend/src/server/web/style.css', './packages/backend/src/server/web/bios.css', './packages/backend/src/server/web/cli.css'])
		.pipe(postcss([cssnano({ preset: 'default' })]))
		.pipe(gulp.dest('./packages/backend/built/server/web/'));
});

gulp.task('build', gulp.parallel(
	'copy:client:locales', 'copy:backend:views', 'copy:backend:manifest', 'build:backend:script', 'build:backend:style', 'copy:client:fonts', 'copy:client:fontawesome'
));

gulp.task('default', gulp.task('build'));

gulp.task('watch', () => {
	gulp.watch([
		'./packages/*/src/**/*',
	], { ignoreInitial: false }, gulp.task('build'));
});
