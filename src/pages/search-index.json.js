import { getCollection } from 'astro:content';
import { categoryOf } from '../lib/categories.js';

export async function GET() {
  const travel = await getCollection('travel');
  const stays = await getCollection('stays');
  const all = [...travel, ...stays].map((entry) => ({
    title: entry.data.title,
    keyword: entry.data.keyword,
    category: categoryOf(entry).label,
    url: `/${entry.collection}/${entry.id}/`
  }));

  return new Response(JSON.stringify(all), {
    headers: { 'Content-Type': 'application/json' }
  });
}
