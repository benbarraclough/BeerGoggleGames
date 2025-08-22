import { defineCollection, z } from 'astro:content';

const baseFields = {
  title: z.string(),
  date: z.string().optional(),
  cover: z.string().optional(),
  tags: z.array(z.string()).optional(),
  excerpt: z.string().optional()
};

const games = defineCollection({
  type: 'content',
  schema: z.object({
    ...baseFields,
    type: z.string().default('misc'),
    players: z.string().optional(),
    equipment: z.array(z.string()).optional()
  })
});

const cocktails = defineCollection({
  type: 'content',
  schema: z.object({
    ...baseFields,
    ingredients: z.array(z.string()).optional(),
    method: z.array(z.string()).optional()
  })
});

const shots = defineCollection({
  type: 'content',
  schema: z.object({
    ...baseFields,
    ingredients: z.array(z.string()).optional(),
    method: z.array(z.string()).optional()
  })
});

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    ...baseFields,
    draft: z.boolean().optional()
  })
});

export const collections = { games, cocktails, shots, posts };
