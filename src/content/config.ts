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
    format: z.string().optional(),
    players: z.string().optional(),
    equipment: z.array(z.string()).optional()
  }).transform(data => {
    if (!data.format && data.players) data.format = data.players;
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
 * Unified drinks collection with singular base + bases array.
 * bases is canonical; base is a convenience field that gets merged into bases.
 */
const drinks = defineCollection({
  type: 'content',
  schema: z.object({
    ...baseFields,
    drinkType: z.string(),                 // 'cocktail' | 'shot' | other
    base: z.string().optional(),
    bases: z.array(z.string()).default([]),
    difficulty: z.string().optional(),
    ingredients: z.array(z.string()).optional(),
    method: z.array(z.string()).optional(),
    time: z.string().optional(),
    glassType: z.string().optional(),
    dietary: z.string().optional(),
    origin: z.string().optional(),
    tips: z.array(z.string()).optional()
  }).transform(d => {
    if (d.difficulty) d.difficulty = d.difficulty.toLowerCase();
    if (d.drinkType) d.drinkType = d.drinkType.toLowerCase();
    let merged = [...d.bases];
    if (d.base) merged.unshift(d.base);
    d.bases = Array.from(new Set(merged.map(b => b.toLowerCase()).filter(Boolean)));
    return d;
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
