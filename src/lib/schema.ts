export function recipeLD(args: {
  title: string;
  description: string;
  ingredients: string[];
  method?: string;
  url: string;
  image?: string;
}) {
  const { title, description, ingredients, method, url, image } = args;
  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: title,
    description,
    recipeCategory: 'Cocktail',
    recipeIngredient: ingredients,
    recipeInstructions: method ? [{ '@type': 'HowToStep', text: method }] : undefined,
    image: image ? [image] : undefined,
    url,
    inLanguage: 'en'
  };
}

export function gameLD(args: {
  title: string;
  description: string;
  type?: string;
  url: string;
}) {
  const { title, description, type, url } = args;
  return {
    '@context': 'https://schema.org',
    '@type': 'Game',
    name: title,
    description,
    gameCategory: type || undefined,
    url,
    inLanguage: 'en'
  };
}

export function activityLD(args: {
  title: string;
  description: string;
  url: string;
}) {
  const { title, description, url } = args;
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: title,
    description,
    url,
    inLanguage: 'en'
  };
}

export function postLD(args: {
  title: string;
  description: string;
  url: string;
  date?: string | Date;
  image?: string;
}) {
  const { title, description, url, date, image } = args;
  const dateIso = date ? new Date(date).toISOString() : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    url,
    image: image ? [image] : undefined,
    datePublished: dateIso,
    inLanguage: 'en'
  };
}
