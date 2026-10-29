import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const entry = z.object({
  title: z.string(),                       // H1
  seoTitle: z.string().max(40),            // + " | INNEX Engineering" ≤ 60
  description: z.string().min(50).max(155),
  summary: z.string().max(200),            // card text on hub pages
  order: z.number(),
  standards: z.array(z.string()).default([]),
  questions: z.array(z.string()).min(3),   // "Questions an expert can answer"
  faqs: z.array(z.object({ q: z.string(), a: z.string() })).min(3).max(5),
  related: z.array(z.string()).default([]), // case-type slugs
});

export const collections = {
  caseTypes: defineCollection({ loader: glob({ pattern: '*.md', base: './src/content/case-types' }), schema: entry }),
  services: defineCollection({ loader: glob({ pattern: '*.md', base: './src/content/services' }), schema: entry }),
};
