import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const stays = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/stays' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    city: z.string(),
    country: z.string(),
    affiliateReady: z.boolean().default(false),
    faq: z
      .array(
        z.object({
          question: z.string(),
          answer: z.string()
        })
      )
      .default([])
  })
});

export const collections = { stays };
