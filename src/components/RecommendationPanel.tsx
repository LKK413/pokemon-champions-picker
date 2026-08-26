import { getEntry } from "@/lib/roster";
import { PickRecommendation } from "@/types/pokemon";
import { TypeBadge } from "./TypeBadge";

function displayName(rec: PickRecommendation): string {
  return getEntry(rec.usedSlug)?.nameKo ?? rec.slug;
}

export function RecommendationPanel({ recommendations }: { recommendations: PickRecommendation[] }) {
  if (recommendations.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
        내 파티와 상대 파티를 입력하면 추천 선출이 여기에 표시됩니다.
      </p>
    );
  }

  const top3 = recommendations.slice(0, 3);
  const rest = recommendations.slice(3);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="mb-2 font-semibold">추천 선출 (상위 3마리)</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {top3.map((rec, i) => {
            const entry = getEntry(rec.usedSlug);
            return (
              <div
                key={rec.slug}
                className="flex flex-col gap-2 rounded-xl border-2 border-emerald-500 bg-emerald-50 p-3 dark:bg-emerald-950/30"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    #{i + 1}
                  </span>
                  <span className="text-xs text-zinc-500">
                    유리 {rec.favorableCount} / 불리 {rec.unfavorableCount}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">{entry?.nameKo ?? rec.slug}</span>
                  {rec.usedMega && (
                    <span className="rounded bg-amber-400 px-1 text-xs font-bold text-amber-950">
                      메가
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {entry?.types.map((t) => <TypeBadge key={t} type={t} />)}
                </div>
                <ul className="list-disc space-y-1 pl-4 text-xs text-zinc-600 dark:text-zinc-400">
                  {rec.reasons.map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {rest.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-zinc-500">나머지 파티 비교</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800">
                  <th className="py-1 pr-2">포켓몬</th>
                  <th className="py-1 pr-2">종합 점수</th>
                  <th className="py-1 pr-2">유리</th>
                  <th className="py-1 pr-2">불리</th>
                </tr>
              </thead>
              <tbody>
                {rest.map((rec) => (
                  <tr key={rec.slug} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-1 pr-2">{displayName(rec)}</td>
                    <td className="py-1 pr-2">{rec.totalScore.toFixed(1)}</td>
                    <td className="py-1 pr-2">{rec.favorableCount}</td>
                    <td className="py-1 pr-2">{rec.unfavorableCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

