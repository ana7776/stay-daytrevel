import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const stays = defineCollection({
	loader: glob({ base: './src/content/stays', pattern: '**/*.{md,mdx}' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		keyword: z.string(),
		heroImage: z.string(),
		heroImageAlt: z.string(),
		bodyImage: z.string().optional(),
		bodyImageAlt: z.string().optional(),
		relatedSpots: z.array(z.string()).default([]),
		relatedStays: z.array(z.string()).default([]),
		affiliateReady: z.boolean().default(false),
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		faq: z.array(z.object({ q: z.string(), a: z.string() })).min(4).max(6),
	}),
});

const spots = defineCollection({
	loader: glob({ base: './src/content/spots', pattern: '**/*.{md,mdx}' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		keyword: z.string(),
		heroImage: z.string(),
		heroImageAlt: z.string(),
		bodyImage: z.string().optional(),
		bodyImageAlt: z.string().optional(),
		relatedSpots: z.array(z.string()).default([]),
		relatedStays: z.array(z.string()).default([]),
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		faq: z.array(z.object({ q: z.string(), a: z.string() })).min(4).max(6),
	}),
});

export const collections = { stays, spots };
