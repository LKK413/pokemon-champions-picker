import { PokeType } from "@/types/pokemon";

export const ALL_TYPES: PokeType[] = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
];

/** attacker -> { defender: multiplier }. Any pair not listed defaults to 1x. */
const CHART: Partial<Record<PokeType, Partial<Record<PokeType, number>>>> = {
  normal: { rock: 0.5, steel: 0.5, ghost: 0 },
  fire: {
    grass: 2, ice: 2, bug: 2, steel: 2,
    fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5,
  },
  water: {
    fire: 2, ground: 2, rock: 2,
    water: 0.5, grass: 0.5, dragon: 0.5,
  },
  electric: {
    water: 2, flying: 2,
    electric: 0.5, grass: 0.5, dragon: 0.5,
    ground: 0,
  },
  grass: {
    water: 2, ground: 2, rock: 2,
    fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5,
  },
  ice: {
    grass: 2, ground: 2, flying: 2, dragon: 2,
    fire: 0.5, water: 0.5, ice: 0.5, steel: 0.5,
  },
  fighting: {
    normal: 2, ice: 2, rock: 2, dark: 2, steel: 2,
    poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, fairy: 0.5,
    ghost: 0,
  },
  poison: {
    grass: 2, fairy: 2,
    poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5,
    steel: 0,
  },
  ground: {
    fire: 2, electric: 2, poison: 2, rock: 2, steel: 2,
    grass: 0.5, bug: 0.5,
    flying: 0,
  },
  flying: {
    grass: 2, fighting: 2, bug: 2,
    electric: 0.5, rock: 0.5, steel: 0.5,
  },
  psychic: {
    fighting: 2, poison: 2,
    psychic: 0.5, steel: 0.5,
    dark: 0,
  },
  bug: {
    grass: 2, psychic: 2, dark: 2,
    fire: 0.5, fighting: 0.5, poison: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5,
  },
  rock: {
    fire: 2, ice: 2, flying: 2, bug: 2,
    fighting: 0.5, ground: 0.5, steel: 0.5,
  },
  ghost: {
    psychic: 2, ghost: 2,
    dark: 0.5,
    normal: 0,
  },
  dragon: {
    dragon: 2,
    steel: 0.5,
    fairy: 0,
  },
  dark: {
    psychic: 2, ghost: 2,
    fighting: 0.5, dark: 0.5, fairy: 0.5,
  },
  steel: {
    ice: 2, rock: 2, fairy: 2,
    fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5,
  },
  fairy: {
    fighting: 2, dragon: 2, dark: 2,
    fire: 0.5, poison: 0.5, steel: 0.5,
  },
};

export const TYPE_KO: Record<PokeType, string> = {
  normal: "노말",
  fire: "불꽃",
  water: "물",
  electric: "전기",
  grass: "풀",
  ice: "얼음",
  fighting: "격투",
  poison: "독",
  ground: "땅",
  flying: "비행",
  psychic: "에스퍼",
  bug: "벌레",
  rock: "바위",
  ghost: "고스트",
  dragon: "드래곤",
  dark: "악",
  steel: "강철",
  fairy: "페어리",
};

/** Effectiveness of a single attacking type against one defending type. */
export function typeEffectiveness(attacker: PokeType, defender: PokeType): number {
  return CHART[attacker]?.[defender] ?? 1;
}

/** Combined effectiveness of a single attacking type against a (1-2 type) defender. */
export function effectivenessVsTypes(attacker: PokeType, defenderTypes: PokeType[]): number {
  return defenderTypes.reduce((mult, t) => mult * typeEffectiveness(attacker, t), 1);
}
