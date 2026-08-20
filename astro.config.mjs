import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
	site: 'https://stay.daytrevel.com',
	trailingSlash: 'always',
	integrations: [
		mdx(),
		sitemap({
			filter: (page) => !page.includes('/404'),
			serialize: (item) => ({
				...item,
				changefreq: 'monthly',
				priority: item.url.replace(/https?:\/\/[^/]+\//, '') === '' ? 1.0 : 0.7,
			}),
		}),
	],
});
