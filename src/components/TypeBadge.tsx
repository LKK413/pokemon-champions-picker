import { TYPE_KO } from "@/data/typeChart";
import { PokeType } from "@/types/pokemon";

const TYPE_COLORS: Record<PokeType, string> = {
  normal: "bg-neutral-400 text-white",
  fire: "bg-orange-500 text-white",
  water: "bg-blue-500 text-white",
  electric: "bg-yellow-400 text-black",
  grass: "bg-green-500 text-white",
  ice: "bg-cyan-300 text-black",
  fighting: "bg-red-700 text-white",
  poison: "bg-purple-500 text-white",
  ground: "bg-amber-600 text-white",
  flying: "bg-indigo-300 text-black",
  psychic: "bg-pink-500 text-white",
  bug: "bg-lime-500 text-black",
  rock: "bg-yellow-700 text-white",
  ghost: "bg-violet-700 text-white",
  dragon: "bg-indigo-600 text-white",
  dark: "bg-neutral-700 text-white",
  steel: "bg-slate-400 text-black",
  fairy: "bg-pink-300 text-black",
};

export function TypeBadge({ type }: { type: PokeType }) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium leading-none ${TYPE_COLORS[type]}`}
    >
      {TYPE_KO[type]}
    </span>
  );
}
