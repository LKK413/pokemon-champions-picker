"use client";

import { useMemo, useState } from "react";
import { FormatToggle } from "@/components/FormatToggle";
import { PartyBuilder } from "@/components/PartyBuilder";
import { RecommendationPanel } from "@/components/RecommendationPanel";
import { predictOpponentPicks, recommendPicks } from "@/lib/analysis";
import { BattleFormat, PartySlot } from "@/types/pokemon";

export default function Home() {
  const [format, setFormat] = useState<BattleFormat>("single");
  const [myParty, setMyParty] = useState<PartySlot[]>([]);
  const [oppParty, setOppParty] = useState<PartySlot[]>([]);

  const { recommendations, opponentPrediction } = useMemo(() => {
    const myFilled = myParty.filter((s) => s.slug !== "");
    const oppFilled = oppParty.filter((s) => s.slug !== "");
    if (myFilled.length === 0 || oppFilled.length === 0) {
      return { recommendations: [], opponentPrediction: [] };
    }
    return {
      recommendations: recommendPicks(myFilled, oppFilled, format),
      opponentPrediction: predictOpponentPicks(myFilled, oppFilled, format),
    };
  }, [myParty, oppParty, format]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">포켓몬 챔피언스 선출 도우미</h1>
        <p className="text-sm text-zinc-500">
          내 파티와 상대 파티를 입력하면 타입 상성·메가진화를 기준으로 유리한 포켓몬을 추천합니다
          (싱글 3마리 / 더블 4마리). 같은 로직으로 상대가 낼 것으로 예상되는 선출도 함께 보여줍니다.
          상대가 메가진화할지는 별도로 표시 안 하면 자동으로 최악의 경우(메가진화했을 때)를 가정해
          계산하며, 확실히 아는 경우 직접 기본형/메가진화로 지정할 수 있습니다. 도구는 포켓몬
          챔피언스에 실제로 존재하는 도구만 추천하며(구애머리띠·구애안경 등 본가 전용 도구는 제외),
          특성/도구 추천 자체는 실제 사용률 통계가 아닌 스탯 기반 일반 추천입니다.
        </p>
        <FormatToggle value={format} onChange={setFormat} />
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PartyBuilder title="내 파티" slots={myParty} onChange={setMyParty} megaMode="none" />
        <PartyBuilder title="상대 파티" slots={oppParty} onChange={setOppParty} megaMode="predict" />
      </div>

      <RecommendationPanel recommendations={recommendations} format={format} variant="mine" />
      <RecommendationPanel recommendations={opponentPrediction} format={format} variant="opponent" />
    </div>
  );
}
