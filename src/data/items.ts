import { PokeType } from "@/types/pokemon";

/**
 * Pokémon Champions has its own (smaller) item pool — no Choice Band/Specs, no Assault
 * Vest. This is sourced from the in-game shop list (namu.wiki "Pokémon Champions" §8.1
 * 도구) and Game8's held-item guide, not assumed from mainline VGC.
 */

/** 타입별 위력업(공격 기술 위력 20% 증가) 도구 — 챔피언스에는 구애머리띠/안경이 없어 어태커의 기본 선택지가 된다. */
export const TYPE_POWER_ITEM: Record<PokeType, string> = {
  normal: "실크스카프",
  fire: "목탄",
  water: "신비의물방울",
  electric: "자석",
  grass: "기적의씨",
  ice: "녹지않는얼음",
  fighting: "검은띠",
  poison: "독바늘",
  ground: "부드러운모래",
  flying: "예리한부리",
  psychic: "휘어진스푼",
  bug: "은빛가루",
  rock: "딱딱한돌",
  ghost: "저주의부적",
  dragon: "용의이빨",
  dark: "검은안경",
  steel: "금속코트",
  fairy: "요정의깃털",
};

export const CHAMPIONS_ITEMS = {
  choiceScarf: "구애스카프",
  lifeOrb: "생명의구슬",
  leftovers: "먹다남은음식",
  sitrusBerry: "오랭열매",
  focusSash: "기합의띠",
  focusBand: "기합의머리띠",
  expertBelt: "달인의띠",
  muscleBand: "힘의머리띠",
  wiseGlasses: "박식안경",
  mentalHerb: "멘탈허브",
  lumBerry: "리샘열매",
  shellBell: "조개껍질방울",
  metronome: "메트로놈",
  bigRoot: "큰뿌리",
  kingsRock: "왕의징표석",
  megaStone: "메가스톤(전용, 다른 도구 장착 불가)",
} as const;
