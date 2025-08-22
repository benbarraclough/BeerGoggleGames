/**
 * Auto-generate legacy redirect HTML files with improved slug resolution.
 *
 * Run: node scripts/generate-auto-redirects.js
 *
 * Output: public/legacy/<original/relative/path>.html
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const LEGACY_DIR = path.join(ROOT, 'legacy');
const CONTENT_DIR = path.join(ROOT, 'src', 'content');
const OUT_ROOT = path.join(ROOT, 'public', 'legacy');

// Manual direct path overrides (full relative legacy path -> new path)
const MANUAL_PATH = {
  'Extras/glossary.html': '/posts/drinking-glossary/'
};

// Manual slug overrides (legacy base name WITHOUT .html -> target slug)
const MANUAL_SLUGS = {
  // Activities / extras
  'WheelOfFortune': 'wheel-of-fortune',
  'beerpongchampionship': 'beer-pong-championship',
  'pubgolf': 'pub-golf',
  'undercoveralcoholic': 'undercover-alcoholic',

  // Blog posts
  'Top5DrinkingApps': 'top-5-drinking-apps',
  'bestsummerdrinkingideas': 'best-summer-drinking-ideas',
  'killerpowerhours': 'killer-power-hours',
  'mostusefuldrinkingaccessories': 'most-useful-drinking-accessories',
  'partyprep101': 'party-prep-101',
  'thebestremoteplaydrinkinggames': 'the-best-remote-play-drinking-games',
  'top5greatestpartythemes': 'top-5-greatest-party-themes',

  // Shots
  'BabyGuinness': 'baby-guinness',
  'Blowjob': 'blow-job',
  'Bambooshooter': 'bamboo-shooter',
  'CementMixer': 'cement-mixer',
  'ChilliShot': 'chilli-shot',
  'FlamingDrPepper': 'flaming-dr-pepper',
  'GreenTea': 'green-tea',
  'IrishCarBomb': 'irish-car-bomb',
  'SlipperyNipple': 'slippery-nipple',
  'SnapCrackleDrop': 'snap-crackle-drop',
  'TequilaShot': 'tequila-shot',
  'WashingtonAppleShot': 'washington-apple-shot',
  'BlueBalls': 'blue-balls',
  'BrainHaemorrhage': 'brain-haemorrhage',
  'PineappleUpsideDown': 'pineapple-upside-down',
  'RedSnapperShot': 'red-snapper-shot',
  'ShamrockShot': 'shamrock-shot',

  // Games (card / etc.)
  'BlowMe': 'blow-me',
  'CrossTheBridge': 'cross-the-bridge',
  'DickHead': 'dick-head',
  'FuckTheDealer': 'fuck-the-dealer',
  'NightsAtTheRoundTable': 'nights-at-the-round-table',
  'RideTheBus': 'ride-the-bus',
  'RingOfFire': 'ring-of-fire',
  'StripJackDrunk': 'strip-jack-drunk',
  'TheGrandNational': 'the-grand-national',
  'YouFuckinJoker': 'you-fuckin-joker',
  'MillenniumBridge': 'millennium-bridge',
  'PyramidCoin': 'pyramid-coin',
  'SoBoard': 'so-board',
  'icetrayblitz': 'ice-tray-blitz',
  'IceTrayn': 'ice-trayn',
  'BlowCup': 'blow-cup',
  'CupToss': 'cup-toss',
  'FlipCup': 'flip-cup',
  'GetStacked': 'get-stacked',
  'JurassicChug': 'jurassic-chug',
  'KnockoutFlipCup': 'knockout-flip-cup',
  'QuickFlip': 'quick-flip',
  'TableOfTerror': 'table-of-terror',
  '7-11Doubles': '7-11-doubles',
  'BeerDie': 'beer-die',
  'IrishLuckCup': 'irish-luck-cup',
  'LiarsDice': 'liars-dice',
  'LuckyNumber': 'lucky-number',
  'OddOrEven': 'odd-or-even',
  'SixCups': 'six-cups',
  'ThreeMan': 'three-man',
  'BattleShots': 'battle-shots',
  'BoatRace': 'boat-race',
  'CanSlide': 'can-slide',
  'DrunkJenga': 'drunk-jenga',
  'FingersOn': 'fingers-on',
  'InfinityPool': 'infinity-pool',
  'MajorityRules': 'majority-rules',
  'RaceCarShots': 'race-car-shots',
  'ShuffleBeer': 'shuffle-beer',
  'SlapShots': 'slap-shots',
  'TealightTrial': 'tealight-trial',
  'BeerDarts': 'beer-darts',
  'DizzyBat': 'dizzy-bat',
  'FlunkyBall': 'flunky-ball',
  'GoonOfFortune': 'goon-of-fortune',
  'NoEyeCanCatch': 'no-eye-can-catch',
  'PolishHorseshoes': 'polish-horseshoes',
  'SlipnSlide': 'slip-n-slide',
  'SteinRun': 'stein-run',
  'BeerPong': 'beer-pong',
  'BlowBall': 'blow-ball',
  'CivilWar': 'civil-war',
  'HungryHungryHippos': 'hungry-hungry-hippos',
  'KnockoutPong': 'knockout-pong',
  'RageCage': 'rage-cage',
  'RingPong': 'ring-pong',
  'gameofseven': 'game-of-seven',
  'AroundTheWorld': 'around-the-world',
  'BlackBlackWhite': 'black-black-white',
  'DontInterrupt': 'don-t-interrupt',
  'DrinkWhileYouThink': 'drink-while-you-think',
  'FatBoy': 'fat-boy',
  'FuzzyDuck': 'fuzzy-duck',
  'IbbleDibble': 'ibble-dibble',
  'MostLikely': 'most-likely',
  'NeverHaveIEver': 'never-have-i-ever',
  'QuizTipple': 'quiz-tipple',
  'TallyTallyAye': 'tally-tally-aye',
  'UnpopularOpinion': 'unpopular-opinion'
};

// Skip base names (aggregators, index-style)
const SKIP_BASENAMES = new Set([
  '404','index','sitemap','about','contact',
  'drinks','extras','GameCategories','AllGames',
  '1v1Games','CardGames','CoinGames','CupGames',
  'DiceGames','FreeForAllGames','MiscGames','OutdoorGames',
  'PairGames','PongGames','TeamGames','VocalGames',
  'blog','activities&minigames','DrinkSearchTool',
  'ShotRecipes','CocktailRecipes'
]);

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }
function walk(dir){
  const out=[];
  if(!fs.existsSync(dir)) return out;
  for(const e of fs.readdirSync(dir)){
    const full=path.join(dir,e);
    const st=fs.statSync(full);
    if(st.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function loadSlugs() {
  const index = {};
  const collections = ['games','cocktails','shots','activities','posts'];
  for (const c of collections) {
    const dir = path.join(CONTENT_DIR, c);
    if (!fs.existsSync(dir)) continue;
    index[c] = fs.readdirSync(dir)
      .filter(f=>f.endsWith('.md'))
      .map(f=>f.replace(/\.md$/,''));
  }
  return index;
}

function normalize(s){
  return s.toLowerCase().replace(/[^a-z0-9]/g,'');
}

// Try fuzzy match across collections
function fuzzyFindSlug(baseName, slugsIndex) {
  const targetNorm = normalize(baseName);
  for (const [collection, slugs] of Object.entries(slugsIndex)) {
    for (const slug of slugs) {
      if (normalize(slug) === targetNorm) {
        return { collection, slug };
      }
    }
  }
  return null;
}

function guessCollectionByLegacyPath(relLower) {
  if (relLower.includes('cocktailrecipes')) return 'cocktails';
  if (relLower.includes('shotrecipes')) return 'shots';
  if (relLower.includes('activities&minigames')) return 'activities';
  if (relLower.includes('blog')) return 'posts';
  if (relLower.includes('gamecategories')) return 'games';
  return null;
}

function buildRedirectHtml(target) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${target}"><title>Redirecting...</title><script>location.replace(${JSON.stringify(target)});</script></head><body><p>Redirecting to <a href="${target}">${target}</a></p></body></html>`;
}

function main(){
  const slugsIndex = loadSlugs(); // {collection: [slug,...]}
  const legacyFiles = walk(LEGACY_DIR).filter(f=>f.endsWith('.html'));
  const written = [];
  const manualPaths = [];
  const unresolved = [];

  legacyFiles.forEach(file=>{
    const rel = path.relative(LEGACY_DIR, file).replace(/\\/g,'/');
    if (MANUAL_PATH[rel]) {
      const target = MANUAL_PATH[rel];
      const outFile = path.join(OUT_ROOT, rel);
      ensureDir(path.dirname(outFile));
      fs.writeFileSync(outFile, buildRedirectHtml(target),'utf8');
      manualPaths.push({rel,target});
      return;
    }

    const base = path.basename(rel, '.html');
    if (SKIP_BASENAMES.has(base)) return;

    // Manual slug override?
    const manualSlug = MANUAL_SLUGS[base] || MANUAL_SLUGS[base.replace(/\.html$/,'')];
    let collection = guessCollectionByLegacyPath(rel.toLowerCase());
    let slug = manualSlug;

    if (!slug) {
      // Attempt naive slug (kebab)
      const naive = base
        .replace(/([a-z0-9])([A-Z])/g,'$1-$2')
        .replace(/&/g,'-and-')
        .replace(/[^A-Za-z0-9]+/g,'-')
        .replace(/-+/g,'-')
        .replace(/^-|-$/g,'')
        .toLowerCase();

      // If that naive form exists in any collection use it.
      let found = null;
      for (const [c, slugs] of Object.entries(slugsIndex)) {
        if (slugs.includes(naive)) { found = {c, slug: naive}; break; }
      }
      if (found) {
        slug = found.slug;
        collection = collection || found.c;
      } else {
        // Fuzzy compare
        const fuzzy = fuzzyFindSlug(base, slugsIndex);
        if (fuzzy) {
          slug = fuzzy.slug;
          collection = collection || fuzzy.collection;
        }
      }
    } else {
      // Known manual slug: ensure collection if still unset via fuzzy
      if (!collection) {
        for (const [c, slugs] of Object.entries(slugsIndex)) {
          if (slugs.includes(slug)) { collection = c; break; }
        }
      }
    }

    if (!slug || !collection) {
      unresolved.push(rel);
      return;
    }

    const target = `/${collection}/${slug}/`;
    const outFile = path.join(OUT_ROOT, rel);
    ensureDir(path.dirname(outFile));
    fs.writeFileSync(outFile, buildRedirectHtml(target),'utf8');
    written.push({rel,target});
  });

  console.log(`Redirects generated: ${written.length}`);
  console.log(`Manual path overrides: ${manualPaths.length}`);
  if (unresolved.length) {
    console.log('Unresolved legacy files (add to MANUAL_SLUGS or MANUAL_PATH):');
    unresolved.forEach(u=>console.log('  ' + u));
  } else {
    console.log('All legacy files mapped.');
  }
}

main();
