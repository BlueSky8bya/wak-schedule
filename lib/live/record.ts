import { createSupabaseAdminClient } from "@/lib/auth/admin";
import type { LiveState } from "@/lib/live/types";

// 방송 세션 기록(ADR-0012) — /api/live의 서버 캐시 '갱신 순간'에만 불린다(20초에 최대 1회,
// 시청자 수와 무관한 고정 부하). 실패는 조용히 — 기록은 부가 기능, 라이브 응답을 막으면 안 된다.
//
// 시작: SOOP BTIME 기반 startedAt이 세션 키 — 폴링이 늦게 시작돼도 시작시각이 정확하고,
// 같은 방송은 항상 같은 행에 도장(last_seen_at)만 갱신된다.
// 종료: 방송이 꺼진 걸 본 순간, 열려 있는 세션의 ended_at을 last_seen_at으로 닫는다
// (마지막으로 방송 중이던 시각까지를 방송으로 친다 — 폴링 공백을 방송시간으로 부풀리지 않기).
export function recordBroadcastSample(state: LiveState): void {
  const admin = createSupabaseAdminClient();
  if (!admin) return;

  void (async () => {
    try {
      const now = new Date().toISOString();
      if (state.isLive && state.startedAt) {
        await admin
          .from("broadcast_sessions")
          .upsert(
            { started_at: state.startedAt, last_seen_at: now, ended_at: null },
            { onConflict: "started_at" }
          );
      } else if (!state.isLive) {
        // 열린 세션 닫기 — last_seen_at을 종료시각으로.
        const { data: open } = await admin
          .from("broadcast_sessions")
          .select("started_at, last_seen_at")
          .is("ended_at", null)
          .limit(5);
        for (const row of (open ?? []) as { started_at: string; last_seen_at: string }[]) {
          await admin
            .from("broadcast_sessions")
            .update({ ended_at: row.last_seen_at })
            .eq("started_at", row.started_at);
        }
      }
    } catch {
      /* 기록 실패 무시 — 다음 갱신이 재시도 기회 */
    }
  })();
}
