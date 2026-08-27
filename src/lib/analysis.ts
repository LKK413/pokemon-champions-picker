import { CHAMPIONS_ITEMS, TYPE_POWER_ITEM } from "@/data/items";
import { TYPE_KO, effectivenessVsTypes } from "@/data/typeChart";
import { getEntry, getMegaOptions } from "@/lib/roster";
import {
  BattleFormat,
  OpponentMatchup,
  PartySlot,
  PickRecommendation,
  PokeType,
  RosterEntry,
} from "@/types/pokemon";

/** Abilities that neutralize (or redirect) an incoming attacking type. Heuristic, not exhaustive. */
const IMMUNITY_ABILITIES: Record<string, PokeType> = {
  levitate: "ground",
  "water-absorb": "water",
  "volt-absorb": "electric",
  "motor-drive": "electric",
  "lightning-rod": "electric",
  "flash-fire": "fire",
  "sap-sipper": "grass",
  "storm-drain": "water",
  "earth-eater": "ground",
};

const NOTABLE_ABILITIES = new Set([
  ...Object.keys(IMMUNITY_ABILITIES),
  "intimidate",
  "speed-boost",
  "unburden",
  "regenerator",
  "prankster",
  "magic-guard",
  "moxie",
  "moldbreaker",
  "mold-breaker",
  "adaptability",
  "huge-power",
  "pure-power",
]);

/** Maps a raw type-effectiveness multiplier to a roughly log2-spaced score. 0x is treated as worse than 0.25x. */
function scoreOfMultiplier(mult: number): number {
  if (mult <= 0) return -3;
  if (mult < 0.5) return -2;
  if (mult < 1) return -1;
  if (mult < 2) return 0;
  if (mult < 4) return 1;
  return 2;
}

export type RoleTag =
  | "physicalAttacker"
  | "specialAttacker"
  | "mixedAttacker"
  | "fast"
  | "slow"
  | "bulky";

export function roleTags(entry: RosterEntry): RoleTag[] {
  const { atk, spa, def, spd, spe, hp } = entry.baseStats;
  const tags: RoleTag[] = [];
  if (atk - spa >= 15 && atk >= 90) tags.push("physicalAttacker");
  else if (spa - atk >= 15 && spa >= 90) tags.push("specialAttacker");
  else if (Math.max(atk, spa) >= 90) tags.push("mixedAttacker");
  if (spe >= 100) tags.push("fast");
  if (spe <= 60) tags.push("slow");
  if (def + spd >= 190 && hp >= 70) tags.push("bulky");
  return tags;
}

export interface ItemSuggestion {
  name: string;
  note: string;
}

export interface Loadout {
  roleTags: RoleTag[];
  suggestedAbility: { name: string; nameKo: string | null } | null;
  suggestedItems: ItemSuggestion[];
}

function typeItemSuggestion(type: PokeType): ItemSuggestion {
  return { name: TYPE_POWER_ITEM[type], note: `${TYPE_KO[type]} 기술 위력 상승` };
}

/** Ordered, de-duplicated list of items worth considering for this Pokémon, most fitting first. */
function itemCandidates(entry: RosterEntry, tags: RoleTag[]): ItemSuggestion[] {
  const isAttacker =
    tags.includes("physicalAttacker") || tags.includes("specialAttacker") || tags.includes("mixedAttacker");
  const bulky = tags.includes("bulky");

  const ordered: ItemSuggestion[] = [];
  if (tags.includes("fast") && isAttacker) {
    ordered.push({ name: CHAMPIONS_ITEMS.choiceScarf, note: "스피드 극대화 (첫 기술로 고정됨)" });
  }
  if (isAttacker) {
    ordered.push(typeItemSuggestion(entry.types[0]));
    if (entry.types[1]) ordered.push(typeItemSuggestion(entry.types[1]));
  }
  if (bulky) {
    ordered.push({ name: CHAMPIONS_ITEMS.leftovers, note: "매턴 자동 회복" });
    ordered.push({ name: CHAMPIONS_ITEMS.sitrusBerry, note: "체력이 낮아지면 자동 회복" });
  }
  if (isAttacker) {
    ordered.push({ name: CHAMPIONS_ITEMS.lifeOrb, note: "모든 기술 위력 상승 (반동 있음)" });
    ordered.push({ name: CHAMPIONS_ITEMS.expertBelt, note: "효과가 굉장한 기술 위력 상승" });
    ordered.push({ name: CHAMPIONS_ITEMS.focusSash, note: "체력이 가득 찼을 때 1회 버티기" });
  }
  ordered.push({ name: CHAMPIONS_ITEMS.leftovers, note: "매턴 자동 회복" });
  ordered.push({ name: CHAMPIONS_ITEMS.sitrusBerry, note: "체력이 낮아지면 자동 회복" });
  for (const t of entry.types) ordered.push(typeItemSuggestion(t));
  for (const t of Object.keys(TYPE_POWER_ITEM) as PokeType[]) ordered.push(typeItemSuggestion(t));

  const seen = new Set<string>();
  return ordered.filter((item) => (seen.has(item.name) ? false : (seen.add(item.name), true)));
}

/**
 * Heuristic "commonly useful" ability/item suggestion derived from base stats, available
 * abilities, and Pokémon Champions' actual (smaller) item pool — Champions has no public
 * usage-rate data yet, so this is a role-based estimate, not a real usage statistic. Items
 * already taken by an earlier pick in the same party (`avoidItems`) are skipped, since
 * Champions doesn't allow two of your six Pokémon to hold the same item.
 */
export function suggestLoadout(entry: RosterEntry, avoidItems: Set<string> = new Set()): Loadout {
  const tags = roleTags(entry);
  const ability =
    entry.abilities.find((a) => NOTABLE_ABILITIES.has(a.name)) ??
    entry.abilities.find((a) => a.isHidden) ??
    entry.abilities[0] ??
    null;

  let items: ItemSuggestion[];
  if (entry.isMega) {
    items = [{ name: CHAMPIONS_ITEMS.megaStone, note: "메가진화를 위해 반드시 장착해야 함" }];
  } else {
    const candidates = itemCandidates(entry, tags);
    const available = candidates.filter((c) => !avoidItems.has(c.name));
    items = (available.length > 0 ? available : candidates).slice(0, 2);
  }

  return { roleTags: tags, suggestedAbility: ability, suggestedItems: items };
}

interface PairResult extends OpponentMatchup {
  advantage: number;
}

function scorePair(
  me: RosterEntry,
  myAbilitySlugs: string[],
  opp: RosterEntry,
  opponentBaseSlug: string,
  opponentUsedMega: boolean,
  format: BattleFormat,
): PairResult {
  let myBest = { type: me.types[0], score: -Infinity };
  for (const t of me.types) {
    const eff = effectivenessVsTypes(t, opp.types);
    const s = scoreOfMultiplier(eff);
    if (s > myBest.score) myBest = { type: t, score: s };
  }

  let theirBest = { type: opp.types[0], score: -Infinity };
  for (const t of opp.types) {
    let eff = effectivenessVsTypes(t, me.types);
    if (myAbilitySlugs.some((a) => IMMUNITY_ABILITIES[a] === t)) eff = 0;
    const s = scoreOfMultiplier(eff);
    if (s > theirBest.score) theirBest = { type: t, score: s };
  }

  let advantage = myBest.score - theirBest.score;

  const oppIsPhysical = opp.baseStats.atk > opp.baseStats.spa;
  if (myAbilitySlugs.includes("intimidate") && oppIsPhysical) {
    advantage += format === "double" ? 0.8 : 0.5;
  }

  return {
    opponentSlug: opponentBaseSlug,
    opponentUsedMega,
    advantage,
    myBestAttackType: myBest.type,
    myBestAttackScore: myBest.score,
    theirBestAttackType: theirBest.type,
    theirBestAttackScore: theirBest.score,
    immuneToTheirBest: theirBest.score === -3,
  };
}

/** Which form(s) of this opponent slot to consider, per its manual override (default: both). */
function opponentFormCandidates(slot: PartySlot): { entry: RosterEntry; usedMega: boolean }[] {
  const base = getEntry(slot.slug);
  if (!base) return [];
  const megas = getMegaOptions(base);
  const choice = slot.megaChoice ?? "auto";

  if (choice === "base" || megas.length === 0) return [{ entry: base, usedMega: false }];
  if (choice === "mega") return megas.map((m) => ({ entry: m, usedMega: true }));
  return [{ entry: base, usedMega: false }, ...megas.map((m) => ({ entry: m, usedMega: true }))];
}

/**
 * Scores my Pokémon against one opponent slot. When the opponent's Mega isn't manually pinned,
 * this assumes worst case for me: whichever of their available forms (base or Mega) yields the
 * least favorable matchup, since we can't know ahead of time whether they'll Mega evolve.
 */
function scoreAgainstOpponentSlot(
  me: RosterEntry,
  myAbilitySlugs: string[],
  oppSlot: PartySlot,
  format: BattleFormat,
): PairResult | undefined {
  const candidates = opponentFormCandidates(oppSlot);
  if (candidates.length === 0) return undefined;

  let worst: PairResult | undefined;
  for (const candidate of candidates) {
    const result = scorePair(me, myAbilitySlugs, candidate.entry, oppSlot.slug, candidate.usedMega, format);
    if (!worst || result.advantage < worst.advantage) worst = result;
  }
  return worst;
}

function nameOf(slug: string): string {
  return getEntry(slug)?.nameKo ?? slug;
}

function buildReasons(
  usedEntry: RosterEntry,
  baseEntry: RosterEntry,
  usedMega: boolean,
  matchups: PairResult[],
  loadout: Loadout,
): string[] {
  const reasons: string[] = [];

  const strong = matchups.filter((m) => m.advantage >= 1);
  const weak = matchups.filter((m) => m.advantage <= -1);
  const immune = matchups.filter((m) => m.immuneToTheirBest && m.theirBestAttackScore > -Infinity);

  if (strong.length > 0) {
    reasons.push(
      `${strong.map((m) => nameOf(m.opponentSlug)).join(", ")}에게 ${TYPE_KO[strong[0].myBestAttackType]} 타입 등으로 유리한 교환이 가능합니다.`,
    );
  }
  if (immune.length > 0) {
    reasons.push(
      `${immune.map((m) => nameOf(m.opponentSlug)).join(", ")}의 주력 타입 공격을 무효화할 수 있습니다.`,
    );
  }
  if (weak.length > 0) {
    reasons.push(
      `${weak.map((m) => nameOf(m.opponentSlug)).join(", ")}에게는 약점을 찔릴 수 있어 교체 타이밍에 주의가 필요합니다.`,
    );
    const assumedMega = weak.filter((m) => m.opponentUsedMega);
    if (assumedMega.length > 0) {
      reasons.push(
        `${assumedMega.map((m) => nameOf(m.opponentSlug)).join(", ")}은(는) 메가진화했을 때를 가정해 계산한 결과입니다 (메가진화 안 하면 실제로는 덜 불리할 수 있음).`,
      );
    }
  }
  if (usedMega) {
    reasons.push(
      `기본형보다 메가진화 ${baseEntry.nameKo} 쪽이 이 상대 파티에 더 유리해 메가진화 기준으로 평가했습니다 (타입: ${usedEntry.types.map((t) => TYPE_KO[t]).join("/")}).`,
    );
  }

  const abilityLabel = loadout.suggestedAbility
    ? loadout.suggestedAbility.nameKo ?? loadout.suggestedAbility.name
    : "정보 없음";
  const itemLabel = loadout.suggestedItems.map((i) => `${i.name} (${i.note})`).join(", ");
  reasons.push(
    `일반적으로 유용한 특성: ${abilityLabel} · 추천 도구: ${itemLabel} (포켓몬 챔피언스 실제 도구 기준, 스탯 기반 일반 추천이며 사용률 데이터 아님)`,
  );

  return reasons;
}

/**
 * Ranks `myParty` against `oppParty` and returns every valid entry sorted best-first (the caller
 * slices the top 3/4 for the actual pick recommendation). Symmetric in its two arguments — pass
 * (myParty, oppParty) for "which of my Pokémon should I bring", or (oppParty, myParty) via
 * {@link predictOpponentPicks} for "which of their Pokémon are they likely to bring".
 */
export function recommendPicks(
  myParty: PartySlot[],
  oppParty: PartySlot[],
  format: BattleFormat,
): PickRecommendation[] {
  const validOpponents = oppParty.filter((slot) => !!getEntry(slot.slug));

  interface Scored {
    slot: PartySlot;
    base: RosterEntry;
    entry: RosterEntry;
    usedMega: boolean;
    matchups: PairResult[];
    total: number;
  }

  const scored: Scored[] = [];

  for (const slot of myParty) {
    const base = getEntry(slot.slug);
    if (!base) continue;

    const candidates: { entry: RosterEntry; usedMega: boolean }[] = [
      { entry: base, usedMega: false },
      ...getMegaOptions(base).map((m) => ({ entry: m, usedMega: true })),
    ];

    let best: Omit<Scored, "slot" | "base"> | null = null;
    for (const candidate of candidates) {
      const abilitySlugs = candidate.entry.abilities.map((a) => a.name);
      const matchups = validOpponents
        .map((oppSlot) => scoreAgainstOpponentSlot(candidate.entry, abilitySlugs, oppSlot, format))
        .filter((m): m is PairResult => !!m);
      const total = matchups.reduce((sum, m) => sum + m.advantage, 0);
      if (!best || total > best.total) {
        best = { entry: candidate.entry, usedMega: candidate.usedMega, matchups, total };
      }
    }

    if (best) scored.push({ slot, base, ...best });
  }

  scored.sort((a, b) => b.total - a.total);

  // Champions doesn't allow two of your six Pokémon to hold the same item, so item picks are
  // assigned in rank order, each avoiding items already claimed by a higher-ranked pick.
  const claimedItems = new Set<string>();
  return scored.map((s) => {
    const loadout = suggestLoadout(s.entry, claimedItems);
    for (const item of loadout.suggestedItems) {
      if (item.name !== CHAMPIONS_ITEMS.megaStone) claimedItems.add(item.name);
    }
    const reasons = buildReasons(s.entry, s.base, s.usedMega, s.matchups, loadout);

    return {
      slug: s.slot.slug,
      usedSlug: s.entry.slug,
      usedMega: s.usedMega,
      totalScore: s.total,
      favorableCount: s.matchups.filter((m) => m.advantage >= 1).length,
      unfavorableCount: s.matchups.filter((m) => m.advantage <= -1).length,
      matchups: s.matchups,
      reasons,
    };
  });
}

/**
 * Predicts which of the opponent's Pokémon they're likely to bring: same matchup logic as
 * {@link recommendPicks}, just with the two parties swapped so each opponent Pokémon is scored
 * as if it were being picked against my party.
 */
export function predictOpponentPicks(
  myParty: PartySlot[],
  oppParty: PartySlot[],
  format: BattleFormat,
): PickRecommendation[] {
  return recommendPicks(oppParty, myParty, format);
}
