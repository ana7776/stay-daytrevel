import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

console.log('[debug] PUBLIC_ADSENSE_CLIENT at build time:', JSON.stringify(process.env.PUBLIC_ADSENSE_CLIENT));

export default defineConfig({
  site: 'https://stay.daytrevel.com',
  integrations: [mdx(), sitemap()],
  output: 'static'
});
