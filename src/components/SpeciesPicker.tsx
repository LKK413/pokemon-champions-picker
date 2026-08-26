"use client";

import { useId, useState } from "react";
import { BASE_SPECIES, getEntry } from "@/lib/roster";

export function SpeciesPicker({
  slug,
  onSelect,
  placeholder = "포켓몬 이름 검색...",
}: {
  slug: string;
  onSelect: (slug: string) => void;
  placeholder?: string;
}) {
  const listId = useId();
  const entry = slug ? getEntry(slug) : undefined;
  const [text, setText] = useState(entry?.nameKo ?? "");

  return (
    <>
      <input
        list={listId}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          const value = e.target.value;
          setText(value);
          const match = BASE_SPECIES.find((s) => s.nameKo === value);
          onSelect(match ? match.slug : "");
        }}
        onBlur={() => {
          if (!getEntry(slug)) {
            setText("");
          } else {
            setText(getEntry(slug)!.nameKo);
          }
        }}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-500"
      />
      <datalist id={listId}>
        {BASE_SPECIES.map((s) => (
          <option key={s.slug} value={s.nameKo} />
        ))}
      </datalist>
    </>
  );
}
