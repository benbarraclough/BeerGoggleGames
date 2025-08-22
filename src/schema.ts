export function recipeLD({ title, description, ingredients, method, url, image }: {
  title: string; description: string; ingredients: string[]; method?: string; url: string; image?: string;
}) {
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

export function gameLD({ title, description, type, url }: { title: string; description: string; type?: string; url: string; }) {
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

export function activityLD({ title, description, url }: { title: string; description: string; url: string; }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: title,
    description,
    url,
    inLanguage: 'en'
  };
}
