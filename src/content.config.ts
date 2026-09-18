import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const staysSchema = z.object({
  title: z.string(),
  description: z.string(),
  keyword: z.string(),
  pubDate: z.coerce.date(),
  city: z.string(),
  country: z.string(),
  image: z.string().optional(),
  imageAlt: z.string().optional(),
  imageCredit: z.string().optional(),
  imageSource: z.string().optional(),
  affiliateReady: z.boolean().default(false),
  faq: z
    .array(
      z.object({
        q: z.string(),
        a: z.string()
      })
    )
    .default([])
});

const travelSchema = z.object({
  title: z.string(),
  description: z.string(),
  keyword: z.string(),
  pubDate: z.coerce.date(),
  city: z.string(),
  country: z.string(),
  season: z.string().optional(),
  image: z.string().optional(),
  imageAlt: z.string().optional(),
  imageCredit: z.string().optional(),
  imageSource: z.string().optional(),
  faq: z
    .array(
      z.object({
        q: z.string(),
        a: z.string()
      })
    )
    .default([])
});

const stays = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/stays' }),
  schema: staysSchema
});

const travel = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/travel' }),
  schema: travelSchema
});

const staysEn = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/stays-en' }),
  schema: staysSchema
});

const travelEn = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/travel-en' }),
  schema: travelSchema
});

export const collections = { stays, travel, staysEn, travelEn };
