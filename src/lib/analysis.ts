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

export interface Loadout {
  roleTags: RoleTag[];
  suggestedAbility: { name: string; nameKo: string | null } | null;
  suggestedItems: string[];
}

/**
 * Heuristic "commonly useful" ability/item suggestion derived from base stats and available
 * abilities only — Pokémon Champions has no public usage-rate data yet, so this is a role-based
 * estimate, not a real usage statistic.
 */
export function suggestLoadout(entry: RosterEntry): Loadout {
  const tags = roleTags(entry);
  const ability =
    entry.abilities.find((a) => NOTABLE_ABILITIES.has(a.name)) ??
    entry.abilities.find((a) => a.isHidden) ??
    entry.abilities[0] ??
    null;

  const items: string[] = [];
  if (entry.isMega) {
    items.push("메가진화 전용 스톤 (필수 장착, 다른 도구 장착 불가)");
  } else {
    const isAttacker =
      tags.includes("physicalAttacker") ||
      tags.includes("specialAttacker") ||
      tags.includes("mixedAttacker");
    if (tags.includes("fast") && isAttacker) {
      items.push("구애스카프 (선공 확보)");
    } else if (tags.includes("physicalAttacker")) {
      items.push("구애머리띠 (물리 화력 극대화)");
    } else if (tags.includes("specialAttacker")) {
      items.push("구애안경 (특수 화력 극대화)");
    }
    if (tags.includes("bulky")) {
      items.push("먹다 남은 음식 (내구 유지)");
    }
    if (items.length === 0) {
      items.push("생명의구슬 (화력 보조)");
    }
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
    opponentSlug: opp.slug,
    advantage,
    myBestAttackType: myBest.type,
    myBestAttackScore: myBest.score,
    theirBestAttackType: theirBest.type,
    theirBestAttackScore: theirBest.score,
    immuneToTheirBest: theirBest.score === -3,
  };
}

function resolveOpponents(oppParty: PartySlot[]): RosterEntry[] {
  return oppParty
    .map((slot) => {
      const base = getEntry(slot.slug);
      if (!base) return undefined;
      if (!slot.megaActive) return base;
      const megas = getMegaOptions(base);
      return megas[0] ?? base;
    })
    .filter((e): e is RosterEntry => !!e);
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
  }
  if (usedMega) {
    reasons.push(
      `기본형보다 메가진화 ${baseEntry.nameKo} 쪽이 이 상대 파티에 더 유리해 메가진화 기준으로 평가했습니다 (타입: ${usedEntry.types.map((t) => TYPE_KO[t]).join("/")}).`,
    );
  }

  const abilityLabel = loadout.suggestedAbility
    ? loadout.suggestedAbility.nameKo ?? loadout.suggestedAbility.name
    : "정보 없음";
  reasons.push(
    `일반적으로 유용한 특성: ${abilityLabel} · 추천 도구: ${loadout.suggestedItems.join(", ")} (실제 사용률 데이터가 아닌 스탯 기반 일반 추천)`,
  );

  return reasons;
}

export function recommendPicks(
  myParty: PartySlot[],
  oppParty: PartySlot[],
  format: BattleFormat,
): PickRecommendation[] {
  const opponents = resolveOpponents(oppParty);

  const results: PickRecommendation[] = [];

  for (const slot of myParty) {
    const base = getEntry(slot.slug);
    if (!base) continue;

    const candidates: { entry: RosterEntry; usedMega: boolean }[] = [
      { entry: base, usedMega: false },
      ...getMegaOptions(base).map((m) => ({ entry: m, usedMega: true })),
    ];

    let best: {
      entry: RosterEntry;
      usedMega: boolean;
      matchups: PairResult[];
      total: number;
    } | null = null;

    for (const candidate of candidates) {
      const abilitySlugs = candidate.entry.abilities.map((a) => a.name);
      const matchups = opponents.map((opp) => scorePair(candidate.entry, abilitySlugs, opp, format));
      const total = matchups.reduce((sum, m) => sum + m.advantage, 0);
      if (!best || total > best.total) {
        best = { entry: candidate.entry, usedMega: candidate.usedMega, matchups, total };
      }
    }

    if (!best) continue;

    const loadout = suggestLoadout(best.entry);
    const reasons = buildReasons(best.entry, base, best.usedMega, best.matchups, loadout);

    results.push({
      slug: slot.slug,
      usedSlug: best.entry.slug,
      usedMega: best.usedMega,
      totalScore: best.total,
      favorableCount: best.matchups.filter((m) => m.advantage >= 1).length,
      unfavorableCount: best.matchups.filter((m) => m.advantage <= -1).length,
      matchups: best.matchups,
      reasons,
    });
  }

  return results.sort((a, b) => b.totalScore - a.totalScore);
}
