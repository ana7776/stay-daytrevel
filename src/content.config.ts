import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// 대표 이미지: 저작권이 확인된 이미지가 준비되었을 때만 채운다.
// 우선순위는 한국관광공사(공공누리 제1유형, 출처표시) 이미지이며,
// credit에는 "사진: 한국관광공사" 형식으로 공공누리 출처표시 문구를 명시해야 한다.
// 관광공사 이미지가 없는 스팟은 출처·라이선스가 확인된 다른 이미지로 대체할 수 있다.
const imageSchema = z
	.object({
		url: z.string(),
		alt: z.string(),
		credit: z.string(),
		creditUrl: z.string().url().optional(),
	})
	.optional();

const stays = defineCollection({
	loader: glob({ base: './src/content/stays', pattern: '**/*.{md,mdx}' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		keyword: z.string(),
		affiliateReady: z.boolean().default(false),
		image: imageSchema,
		pubDate: z.coerce.date().optional(),
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
		affiliateReady: z.boolean().default(false),
		image: imageSchema,
		pubDate: z.coerce.date().optional(),
		updatedDate: z.coerce.date().optional(),
		faq: z.array(z.object({ q: z.string(), a: z.string() })).min(4).max(6),
	}),
});

export const collections = { stays, spots };
