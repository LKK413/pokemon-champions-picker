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

export interface PartySlot {
  slug: string;
  /** User has toggled this slot to battle in its Mega form (only meaningful if a mega variant exists). */
  megaActive?: boolean;
  knownItem?: string;
  knownAbility?: string;
}

export interface OpponentMatchup {
  opponentSlug: string;
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
