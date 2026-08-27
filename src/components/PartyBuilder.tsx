"use client";

import { getEntry, getMegaOptions } from "@/lib/roster";
import { MegaChoice, PartySlot } from "@/types/pokemon";
import { SpeciesPicker } from "./SpeciesPicker";
import { TypeBadge } from "./TypeBadge";

const MAX_SLOTS = 6;

export function PartyBuilder({
  title,
  slots,
  onChange,
  megaMode = "none",
}: {
  title: string;
  slots: PartySlot[];
  onChange: (slots: PartySlot[]) => void;
  /** "none": my party — the tool auto-picks base vs mega for you. "predict": opponent party — mark if you expect them to mega evolve. */
  megaMode?: "none" | "predict";
}) {
  const padded: PartySlot[] = Array.from({ length: MAX_SLOTS }, (_, i) => slots[i] ?? { slug: "" });

  function updateSlot(index: number, next: PartySlot) {
    const copy = padded.slice();
    copy[index] = next;
    onChange(copy);
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="mb-3 font-semibold">{title}</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {padded.map((slot, i) => {
          const entry = slot.slug ? getEntry(slot.slug) : undefined;
          const megaOptions = entry ? getMegaOptions(entry) : [];
          return (
            <div
              key={i}
              className="flex flex-col gap-1.5 rounded-lg border border-zinc-200 p-2 dark:border-zinc-800"
            >
              <SpeciesPicker
                slug={slot.slug}
                onSelect={(slug) => updateSlot(i, { slug, megaChoice: "auto" })}
              />
              {entry && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {entry.types.map((t) => (
                    <TypeBadge key={t} type={t} />
                  ))}
                  {megaMode === "predict" && megaOptions.length > 0 && (
                    <select
                      className="ml-auto rounded border border-zinc-300 bg-transparent px-1 py-0.5 text-xs text-zinc-500 dark:border-zinc-700"
                      value={slot.megaChoice ?? "auto"}
                      onChange={(e) =>
                        updateSlot(i, { ...slot, megaChoice: e.target.value as MegaChoice })
                      }
                    >
                      <option value="auto">메가진화 자동 예측 (최악의 경우 가정)</option>
                      <option value="base">기본형으로 확정</option>
                      <option value="mega">메가진화로 확정</option>
                    </select>
                  )}
                  {megaMode === "none" && megaOptions.length > 0 && (
                    <span className="ml-auto text-xs text-zinc-400">메가진화 가능 (자동 판단)</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
