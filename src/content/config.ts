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
 * - format replaces players (players kept for legacy)
 * - transform adds format if only players was provided
 */
const games = defineCollection({
  type: 'content',
  schema: z.object({
    ...baseFields,
    type: z.string().default('misc'),
    format: z.string().optional(),
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

/**
 * Unified drinks collection (replaces cocktails + shots)
 * drinkType: 'cocktail' | 'shot' | future types
 * bases: alcohol base(s)
 * difficulty: easy | medium | hard (optional)
 * ingredients & method arrays allow more structured MDX-driven display if you wish
 */
const drinks = defineCollection({
  type: 'content',
  schema: z.object({
    ...baseFields,
    drinkType: z.string(),
    bases: z.array(z.string()).default([]),
    difficulty: z.string().optional(),
    ingredients: z.array(z.string()).optional(),
    method: z.array(z.string()).optional()
  }).transform(data => {
    if (data.difficulty) {
      data.difficulty = data.difficulty.toLowerCase();
    }
    if (data.drinkType) {
      data.drinkType = data.drinkType.toLowerCase();
    }
    return data;
  })
});

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    ...baseFields,
    draft: z.boolean().optional()
  })
});

/**
 * Removed: cocktails, shots (now migrated into drinks).
 * If you still have legacy references, keep the old definitions until migration completes.
 */

export const collections = { games, activities, drinks, posts };
