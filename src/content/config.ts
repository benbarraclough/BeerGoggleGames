import { defineCollection, z } from 'astro:content';

const baseFields = {
  title: z.string(),
  date: z.string().optional(),
  cover: z.string().optional(),
  tags: z.array(z.string()).optional(),
  excerpt: z.string().optional()
};

/**
 * Games collection
 * - format is the new field (replacing players)
 * - players kept for backward compatibility
 * - transform adds format if only players was provided
 */
const games = defineCollection({
  type: 'content',
  schema: z.object({
    ...baseFields,
    type: z.string().default('misc'),
    // New canonical field
    format: z.string().optional(),
    // Deprecated (kept so old files or backlog content still work)
    players: z.string().optional(),
    equipment: z.array(z.string()).optional()
  }).transform(data => {
    if (!data.format && data.players) {
      data.format = data.players;
    }
    return data;
  })
});

const activities = defineCollection({
  type: 'content',
  schema: z.object({
    ...baseFields,
    difficulty: z.string().optional()
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

export const collections = { games, activities, cocktails, shots, posts };
