import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// 대표 이미지: scripts/set-tour-hero-images.mjs(한국관광공사 TourAPI, 우선)
// 또는 scripts/set-hero-images.mjs(Pexels, 폴백)가 자동으로 채운다.
// 로컬 이미지 파일을 astro:assets 로 최적화해서 내보내므로, 값은 같은 폴더의
// 상대 경로(예: './slug-hero.jpg')여야 한다. TourAPI 사진을 쓴 글은 본문 끝에
// "사진: 한국관광공사" 출처 표기가 스크립트로 자동 삽입된다.
const stays = defineCollection({
	loader: glob({ base: './src/content/stays', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			keyword: z.string(),
			affiliateReady: z.boolean().default(false),
			heroImage: z.optional(image()),
			pubDate: z.coerce.date().optional(),
			updatedDate: z.coerce.date().optional(),
			faq: z.array(z.object({ q: z.string(), a: z.string() })).min(4).max(6),
		}),
});

const spots = defineCollection({
	loader: glob({ base: './src/content/spots', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			keyword: z.string(),
			affiliateReady: z.boolean().default(false),
			heroImage: z.optional(image()),
			pubDate: z.coerce.date().optional(),
			updatedDate: z.coerce.date().optional(),
			faq: z.array(z.object({ q: z.string(), a: z.string() })).min(4).max(6),
		}),
});

export const collections = { stays, spots };
