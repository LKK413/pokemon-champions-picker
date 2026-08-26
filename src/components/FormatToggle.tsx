import { BattleFormat } from "@/types/pokemon";

export function FormatToggle({
  value,
  onChange,
}: {
  value: BattleFormat;
  onChange: (format: BattleFormat) => void;
}) {
  const options: { value: BattleFormat; label: string }[] = [
    { value: "single", label: "싱글 배틀" },
    { value: "double", label: "더블 배틀" },
  ];

  return (
    <div className="inline-flex rounded-lg border border-zinc-300 p-1 dark:border-zinc-700">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            value === opt.value
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
