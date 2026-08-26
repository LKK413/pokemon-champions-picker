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

/** The entry to actually use for battle math: mega form if toggled on and available, otherwise base. */
export function resolveActiveForm(slug: string, megaActive?: boolean): RosterEntry | undefined {
  const base = getEntry(slug);
  if (!base) return undefined;
  if (!megaActive) return base;
  const options = getMegaOptions(base);
  return options[0] ?? base;
}
