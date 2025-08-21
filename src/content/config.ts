import { defineCollection, z } from 'astro:content';

const game = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    // type/format optional for now so existing content won’t fail validation
    type: z.enum(['pong', 'dice', 'cup', 'card', 'coin', 'vocal', 'outdoor', 'misc']).optional(),
    format: z.enum(['team', '1v1', 'pair', 'ffa']).optional(),
    players: z.string().optional(),
    equipment: z.array(z.string()).optional(),
    summary: z.string().optional(),
    tags: z.array(z.string()).default([]),
    cover: z.string().optional(),
    updated: z.string().optional()
  })
});

const cocktail = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    ingredients: z.array(z.string()).optional(),
    method: z.array(z.string()).optional(),
    glass: z.string().optional(),
    garnish: z.string().optional(),
    cover: z.string().optional(),
    tags: z.array(z.string()).default([])
  })
});

const shot = defineCollection({ type: 'content', schema: cocktail.schema });

const post = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.string().optional(),
    excerpt: z.string().optional(),
    tags: z.array(z.string()).default([]),
    cover: z.string().optional(),
    draft: z.boolean().default(false)
  })
});

const activity = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    duration: z.string().optional(),
    materials: z.array(z.string()).optional(),
    steps: z.array(z.string()).optional(),
    cover: z.string().optional(),
    tags: z.array(z.string()).default([])
  })
});

export const collections = { games: game, cocktails: cocktail, shots: shot, posts: post, activities: activity };
