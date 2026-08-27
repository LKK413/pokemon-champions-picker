import rosterData from "@/data/roster.json";
import { RosterEntry } from "@/types/pokemon";

export const ROSTER = rosterData as RosterEntry[];

const BY_SLUG = new Map<string, RosterEntry>(ROSTER.map((entry) => [entry.slug, entry]));

export function getEntry(slug: string): RosterEntry | undefined {
  return BY_SLUG.get(slug);
}

/** Non-mega species only, sorted for display in a picker. */
export const BASE_SPECIES: RosterEntry[] = ROSTER.filter((e) => !e.isMega).sort((a, b) =>
  a.nameKo.localeCompare(b.nameKo, "ko"),
);

export function getMegaOptions(entry: RosterEntry): RosterEntry[] {
  if (!entry.megaSlugs) return [];
  return entry.megaSlugs.map((s) => BY_SLUG.get(s)).filter((e): e is RosterEntry => !!e);
}
