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
 */
const games = defineCollection({
  type: 'content',
  schema: z.object({
    ...baseFields,
    type: z.string().default('misc'),
    format: z.string().optional(),
    players: z.string().optional(),      // legacy
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
 * Unified drinks collection
 * Extra optional fields (time, glassType, dietary, origin, tips) give you parity
 * with the legacy "Overview" section if you want to auto-render those later.
 */
const drinks = defineCollection({
  type: 'content',
  schema: z.object({
    ...baseFields,
    drinkType: z.string(),                 // 'cocktail' | 'shot' | etc.
    bases: z.array(z.string()).default([]),
    difficulty: z.string().optional(),     // easy | medium | hard
    ingredients: z.array(z.string()).optional(),
    method: z.array(z.string()).optional(),
    time: z.string().optional(),
    glassType: z.string().optional(),
    dietary: z.string().optional(),
    origin: z.string().optional(),
    tips: z.array(z.string()).optional()
  }).transform(data => {
    if (data.difficulty) data.difficulty = data.difficulty.toLowerCase();
    if (data.drinkType) data.drinkType = data.drinkType.toLowerCase();
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

export const collections = { games, activities, drinks, posts };
