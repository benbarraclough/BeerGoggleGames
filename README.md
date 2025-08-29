# BeerGoggleGames (Astro)

## Develop
- npm install
- npm run dev
- Content lives under src/content (Markdown/MDX).

## Collections
- games: src/content/games
- cocktails: src/content/cocktails
- shots: src/content/shots
- posts: src/content/posts
- activities: src/content/activities

Frontmatter is validated. See examples in each folder.

## URLs (normalized)
- /about
- /games/{type}/{slug}
- /drinks/cocktail-recipes/{slug}
- /drinks/shot-recipes/{slug}
- /extras/{glossary|forfeits|wheel-of-fortune|activities-and-minigames}

## Search
We use Pagefind. Build step indexes content automatically. A default UI is provided at /search.

## Comments
We use Giscus. Enable Discussions on this repo, create a category (e.g., "General"), then visit https://giscus.app/ to generate:
- data-repo-id
- data-category-id
Paste into src/components/Comments.astro.

## Contact form
Create a free Formspree form, then replace the action URL in src/pages/contact.astro:
https://formspree.io/forms
Set the destination email to BeerGoggleGames@hotmail.com.

## Analytics
GA4 is integrated. To change the ID, either:
- Add PUBLIC_GA_ID as a repository secret/environment var for Actions/Pages (value like G-XXXXXXXXXX), or
- Replace the baked-in ID in src/components/Analytics.astro.

## GitHub Pages
This repo uses a base path (/BeerGoggleGames). If you add a custom domain, update astro.config.mjs to:
- site: 'https://yourdomain.tld'
- base: '/' 

## Redirect/normalization
GitHub Pages doesn't support server redirects. We provide client-side normalization for uppercase and ampersands. For critical legacy URLs, we can add small HTML files with meta-refresh.

## Deployment
A workflow deploys when pushing to the site-revamp branch. Once ready:
- Change the workflow trigger to main, or
- Merge site-revamp → main and enable GitHub Pages (Build and deployment: GitHub Actions).
