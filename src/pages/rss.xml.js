import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';

export async function GET(context) {
	const [stays, spots] = await Promise.all([getCollection('stays'), getCollection('spots')]);

	const items = [
		...stays.map((stay) => ({ entry: stay, path: `/stays/${stay.id}/` })),
		...spots.map((spot) => ({ entry: spot, path: `/spots/${spot.id}/` })),
	]
		.map(({ entry, path }) => ({
			title: entry.data.title,
			description: entry.data.description,
			link: path,
			pubDate: entry.data.updatedDate ?? entry.data.pubDate,
		}))
		.sort((a, b) => (b.pubDate?.getTime() ?? 0) - (a.pubDate?.getTime() ?? 0));

	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		customData: '<language>ko-kr</language>',
		items,
	});
}
