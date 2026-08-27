export type PokeType =
  | "normal"
  | "fire"
  | "water"
  | "electric"
  | "grass"
  | "ice"
  | "fighting"
  | "poison"
  | "ground"
  | "flying"
  | "psychic"
  | "bug"
  | "rock"
  | "ghost"
  | "dragon"
  | "dark"
  | "steel"
  | "fairy";

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface AbilityInfo {
  name: string;
  nameKo: string | null;
  isHidden: boolean;
}

export interface RosterEntry {
  slug: string;
  nameKo: string;
  nameEn: string;
  types: PokeType[];
  baseStats: BaseStats;
  abilities: AbilityInfo[];
  isMega: boolean;
  /** Present when isMega is false and this species has mega form(s) available. */
  megaSlugs?: string[];
  /** Present when isMega is true — the base species slug this mega evolves from. */
  baseSlug?: string;
}

export type BattleFormat = "single" | "double";

/**
 * How to treat a party slot's Mega Evolution when scoring matchups.
 * "auto": not manually specified — for the opponent this means "assume whichever form (base
 * or Mega) is most threatening"; for my own party the engine always auto-picks whichever form
 * is most advantageous, so this mode is irrelevant there.
 */
export type MegaChoice = "auto" | "base" | "mega";

export interface PartySlot {
  slug: string;
  /** Opponent slots only — ignored for my own party, which is always auto-optimized. */
  megaChoice?: MegaChoice;
  knownItem?: string;
  knownAbility?: string;
}

export interface OpponentMatchup {
  /** Always the base species slug, regardless of which form was assumed for scoring. */
  opponentSlug: string;
  /** True if the worst-case assumption used this opponent's Mega form for this particular matchup. */
  opponentUsedMega: boolean;
  advantage: number;
  myBestAttackType: PokeType;
  myBestAttackScore: number;
  theirBestAttackType: PokeType;
  theirBestAttackScore: number;
  immuneToTheirBest: boolean;
}

export interface PickRecommendation {
  slug: string;
  usedSlug: string;
  usedMega: boolean;
  totalScore: number;
  favorableCount: number;
  unfavorableCount: number;
  matchups: OpponentMatchup[];
  reasons: string[];
}
