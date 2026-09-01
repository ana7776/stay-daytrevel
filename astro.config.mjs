import { readFileSync, readdirSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

const SITE = 'https://stay.daytrevel.com';

/** 글별 발행일을 읽어 sitemap의 lastmod로 쓴다. */
function articleDates() {
	const map = new Map();
	for (const collection of ['spots', 'stays']) {
		const dir = `./src/content/${collection}`;
		for (const file of readdirSync(dir).filter((f) => f.endsWith('.mdx'))) {
			const front = readFileSync(`${dir}/${file}`, 'utf8').split('---')[1] ?? '';
			const pub = front.match(/^pubDate:\s*(\S+)/m);
			const updated = front.match(/^updatedDate:\s*(\S+)/m);
			const date = updated?.[1] ?? pub?.[1];
			if (date) map.set(`${SITE}/${collection}/${file.replace(/\.mdx$/, '')}/`, new Date(date));
		}
	}
	return map;
}

const LASTMOD = articleDates();

export default defineConfig({
	site: SITE,
	integrations: [
		mdx(),
		sitemap({
			serialize(item) {
				const date = LASTMOD.get(item.url);
				if (date) item.lastmod = date.toISOString();
				return item;
			},
		}),
	],
});
