import { NextResponse } from "next/server";
import { fetchLiveState, type LiveState } from "@/lib/live";
import { recordBroadcastSample } from "@/lib/live/record";

// 스트리머의 SOOP 라이브 상태 — 우리 서버가 대신 폴링한다(시청자 브라우저가 SOOP를 직접
// 때리지 않게: CORS·남용 방지). 비공식 엔드포인트라 깨질 수 있어 실패하면 조용히 오프라인 처리.
// 공개-안전 응답만 반환. 실제 플랫폼 호출은 lib/live(단일 출처).

export const dynamic = "force-dynamic";

// 플랫폼을 이 간격으로만 두드린다(시청자 수와 무관 — 서버가 캐시해 외부 부하를 고정한다).
// 대형 방송(동시 수천~수만 명)에서 이 캐시가 없으면 시청자 수만큼 외부 API를 때려 차단당한다.
const CACHE_TTL_MS = 20_000;

let cache: { at: number; data: LiveState } | null = null;

export async function GET() {
  const now = Date.now();
  if (!cache || now - cache.at > CACHE_TTL_MS) {
    cache = { at: now, data: await fetchLiveState() };
    // 방송 세션 도장(ADR-0012) — 캐시 갱신 순간에만(고정 부하), 응답을 막지 않는다.
    recordBroadcastSample(cache.data);
  }
  return NextResponse.json(cache.data, {
    headers: { "Cache-Control": "public, max-age=30, s-maxage=30" }
  });
}
