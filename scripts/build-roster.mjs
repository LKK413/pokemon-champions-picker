// Fetches full Pokémon data (types, base stats, abilities, Korean names) from PokeAPI
// for every entry in scripts/roster-names.json, and writes src/data/roster.json.
//
// Usage: node scripts/build-roster.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const namesPath = path.join(__dirname, 'roster-names.json');
const outPath = path.join(__dirname, '..', 'src', 'data', 'roster.json');

const rosterNames = JSON.parse(readFileSync(namesPath, 'utf8'));

const API_BASE = 'https://pokeapi.co/api/v2';

// ---------------------------------------------------------------------------
// Small concurrency-limited fetch queue (keeps us polite to PokeAPI)
// ---------------------------------------------------------------------------
const CONCURRENCY = 8;
let active = 0;
const queue = [];

function pump() {
  while (active < CONCURRENCY && queue.length) {
    const { task, resolve } = queue.shift();
    active++;
    task().then(resolve).finally(() => {
      active--;
      pump();
    });
  }
}

function schedule(task) {
  return new Promise((resolve) => {
    queue.push({ task, resolve });
    pump();
  });
}

// Fetches JSON from a URL, retrying once on non-404 failure.
// Returns { ok: true, data } or { ok: false, status, error }.
async function fetchJsonRaw(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 404) {
        return { ok: false, status: 404 };
      }
      if (!res.ok) {
        if (attempt === 0) continue; // retry once
        return { ok: false, status: res.status };
      }
      const data = await res.json();
      return { ok: true, data };
    } catch (err) {
      if (attempt === 0) continue; // retry once
      return { ok: false, error: err.message };
    }
  }
  return { ok: false, error: 'unreachable' };
}

function fetchJson(url) {
  return schedule(() => fetchJsonRaw(url));
}

// ---------------------------------------------------------------------------
// Caches to avoid re-fetching shared species / ability data
// ---------------------------------------------------------------------------
const speciesKoCache = new Map(); // speciesName -> koreanName|null
const abilityKoCache = new Map(); // abilityName -> koreanName|null

async function getSpeciesKoName(speciesName, fallbackEn) {
  if (speciesKoCache.has(speciesName)) return speciesKoCache.get(speciesName);
  const result = await fetchJson(`${API_BASE}/pokemon-species/${speciesName}`);
  let koName = null;
  if (result.ok) {
    const koEntry = result.data.names?.find((n) => n.language?.name === 'ko');
    koName = koEntry ? koEntry.name : null;
  }
  const finalName = koName ?? fallbackEn;
  speciesKoCache.set(speciesName, finalName);
  return finalName;
}

async function getAbilityKoName(abilityName) {
  if (abilityKoCache.has(abilityName)) return abilityKoCache.get(abilityName);
  const result = await fetchJson(`${API_BASE}/ability/${abilityName}`);
  let koName = null;
  if (result.ok) {
    const koEntry = result.data.names?.find((n) => n.language?.name === 'ko');
    koName = koEntry ? koEntry.name : null;
  }
  abilityKoCache.set(abilityName, koName);
  return koName;
}

// ---------------------------------------------------------------------------
// Korean form-suffix logic
// ---------------------------------------------------------------------------
function paldeaBreedTag(slug) {
  if (slug.includes('combat-breed')) return '전투';
  if (slug.includes('blaze-breed')) return '불꽃';
  if (slug.includes('aqua-breed')) return '물';
  return null;
}

function buildNameKo(entry, speciesKo) {
  if (entry.isMega) {
    if (entry.formType === 'mega-x') return `${speciesKo}(메가진화X)`;
    if (entry.formType === 'mega-y') return `${speciesKo}(메가진화Y)`;
    return `${speciesKo}(메가진화)`;
  }
  switch (entry.formType) {
    case 'alola':
      return `${speciesKo}(알로라)`;
    case 'galar':
      return `${speciesKo}(가라르)`;
    case 'hisui':
      return `${speciesKo}(히스이)`;
    case 'paldea': {
      const tag = paldeaBreedTag(entry.slug);
      return tag ? `${speciesKo}(팔데아-${tag})` : `${speciesKo}(팔데아)`;
    }
    case 'eternal':
      return `${speciesKo}(이터널플라워)`;
    default:
      return speciesKo;
  }
}

// ---------------------------------------------------------------------------
// Main fetch per roster entry
// ---------------------------------------------------------------------------
const STAT_MAP = {
  hp: 'hp',
  attack: 'atk',
  defense: 'def',
  'special-attack': 'spa',
  'special-defense': 'spd',
  speed: 'spe',
};

async function processEntry(entry) {
  const apiSlug = entry.apiSlug ?? entry.slug;
  const pokemonResult = await fetchJson(`${API_BASE}/pokemon/${apiSlug}`);
  if (!pokemonResult.ok) {
    return { entry, error: `pokemon/${apiSlug}: ${pokemonResult.status ?? pokemonResult.error}` };
  }
  const pdata = pokemonResult.data;

  const speciesName = pdata.species?.name ?? entry.speciesSlug;
  const speciesKo = await getSpeciesKoName(speciesName, entry.displayName);

  const nameKo = buildNameKo(entry, speciesKo);

  const types = [...pdata.types]
    .sort((a, b) => a.slot - b.slot)
    .map((t) => t.type.name);

  const baseStats = {};
  for (const s of pdata.stats) {
    const key = STAT_MAP[s.stat.name];
    if (key) baseStats[key] = s.base_stat;
  }

  const abilities = await Promise.all(
    pdata.abilities.map(async (a) => ({
      name: a.ability.name,
      nameKo: await getAbilityKoName(a.ability.name),
      isHidden: a.is_hidden,
    }))
  );

  const out = {
    slug: entry.slug,
    nameKo,
    nameEn: entry.displayName + (entry.formLabel ? ` (${entry.formLabel.replace(/<br>/g, ' ')})` : ''),
    types,
    baseStats,
    abilities,
    isMega: entry.isMega,
  };

  if (entry.isMega) {
    out.baseSlug = entry.baseSlug;
  } else {
    const megaSlugs = rosterNames
      .filter((e) => e.isMega && e.speciesSlug === entry.speciesSlug && entry.formType === null)
      .map((e) => e.slug);
    if (megaSlugs.length) out.megaSlugs = megaSlugs;
  }

  return { entry, out };
}

async function main() {
  console.log(`Fetching data for ${rosterNames.length} roster entries (concurrency=${CONCURRENCY})...`);
  const results = await Promise.all(rosterNames.map(processEntry));

  const succeeded = [];
  const failed = [];
  for (const r of results) {
    if (r.out) succeeded.push(r.out);
    else failed.push(r);
  }

  // Sort by dex number then slug for stable, readable output
  const dexByslug = new Map(rosterNames.map((e) => [e.slug, e.dexNum]));
  succeeded.sort((a, b) => {
    const da = dexByslug.get(a.slug) ?? '9999';
    const db = dexByslug.get(b.slug) ?? '9999';
    if (da !== db) return da.localeCompare(db);
    return a.slug.localeCompare(b.slug);
  });

  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(succeeded, null, 2));

  console.log('');
  console.log('=== Summary ===');
  console.log(`Total roster entries attempted: ${rosterNames.length}`);
  console.log(`Succeeded: ${succeeded.length}`);
  console.log(`Failed/skipped: ${failed.length}`);
  if (failed.length) {
    console.log('Failed slugs:');
    for (const f of failed) {
      console.log(`  - ${f.entry.slug} (${f.entry.displayName}${f.entry.formLabel ? ' - ' + f.entry.formLabel : ''}): ${f.error}`);
    }
  }

  console.log('');
  console.log('=== Sanity spot-check ===');
  for (const slug of ['charizard', 'gengar', 'garchomp', 'greninja', 'mewtwo']) {
    const e = succeeded.find((x) => x.slug === slug);
    if (e) {
      console.log(`${slug}: OK - ${e.nameKo} / ${e.nameEn} - types=${e.types.join('/')} - stats=${JSON.stringify(e.baseStats)}`);
    } else {
      console.log(`${slug}: NOT FOUND in output (expected if not in Champions roster, e.g. Mewtwo is a Legendary and excluded by design)`);
    }
  }

  console.log('');
  console.log(`Wrote ${succeeded.length} entries to ${outPath}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
