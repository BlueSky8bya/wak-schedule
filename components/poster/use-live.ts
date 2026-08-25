"use client";

import { useEffect, useState } from "react";

// 스트리머 라이브 상태 폴링 훅 — /api/live(서버가 20초 캐시 폴링)만 호출한다.
// 한 페이지에서 한 번만 호출해 데스크탑 비콘·모바일 '오늘' 버튼이 같은 상태를 공유한다.
// (플랫폼 API를 브라우저가 직접 때리지 않는다 — 대형 방송에서 시청자 수만큼 외부 호출이 나가면
//  차단당한다. 서버 캐시가 외부 부하를 고정한다.)
export type LivePresence = {
  isLive: boolean;
  channelId?: string; // 임베드 플레이어용(서버 응답에 포함 — 공개 채널 id)
  nickname: string | null;
  title: string | null;
  category: string | null;
  liveId?: string | null; // 방송 회차 식별자(임베드 주소용)
  watchUrl: string | null;
};

const POLL_MS = 25_000;

export function useLivePresence(enabled = true): LivePresence | null {
  const [live, setLive] = useState<LivePresence | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/live", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as LivePresence;
        if (alive) setLive(data);
      } catch {
        /* 네트워크 실패 시 직전 상태 유지 */
      }
    };
    void tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [enabled]);

  return live;
}
