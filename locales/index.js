/**
 * Languages Loader
 */

const fs = require('fs');
const yaml = require('js-yaml');

const merge = (...args) => args.reduce((a, c) => ({
	...a,
	...c,
	...Object.entries(a)
		.filter(([k]) => c && typeof c[k] === 'object')
		.reduce((a, [k, v]) => (a[k] = merge(v, c[k]), a), {})
}), {});

const languages = [
	'ja-NCAT',
];

const primaries = {
	'ja': 'JP',
};

// 何故か文字列にバックスペース文字が混入することがあり、YAMLが壊れるので取り除く
const clean = (text) => text.replace(new RegExp(String.fromCodePoint(0x08), 'g'), '');

const locales = languages.reduce((a, c) => (a[c] = yaml.load(clean(fs.readFileSync(`${__dirname}/${c}.yml`, 'utf-8'))) || {}, a), {});

module.exports = Object.entries(locales)
	.reduce((a, [k ,v]) => (a[k] = (() => {
		const [lang] = k.split('-');
		switch (k) {
			case 'ja-NCAT': return v;
			default: return merge(
				locales['ja-NCAT'],

				locales[`${lang}-${primaries[lang]}`] || {},
				v
			);
		}
	})(), a), {});
