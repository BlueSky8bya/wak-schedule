import { offlineState, type LiveProvider, type LiveState } from "@/lib/live/types";

// SOOP(구 아프리카TV) 라이브 상태. 비공식 엔드포인트라 실패하면 조용히 오프라인.
const BJ_ID = process.env.SOOP_BJ_ID ?? "";
const LIVE_API = "https://live.sooplive.com/afreeca/player_live_api.php";

// BTIME(방송 경과 초) → 시작 ISO. 0 이하·48시간 초과는 이상치로 버린다(파싱 실패·API 이변 방어).
export function startedAtFromBtime(btime: unknown, nowMs: number): string | null {
  const sec = Number(btime);
  if (!Number.isFinite(sec) || sec <= 0 || sec > 48 * 3600) return null;
  return new Date(nowMs - sec * 1000).toISOString();
}

export const soopProvider: LiveProvider = {
  name: "soop",
  channelId: BJ_ID,
  async fetchLive(): Promise<LiveState> {
    if (!BJ_ID) return offlineState("");
    try {
      const res = await fetch(LIVE_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0"
        },
        body: new URLSearchParams({ bid: BJ_ID, type: "live", player_type: "html5" }),
        cache: "no-store",
        signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) return offlineState(BJ_ID);
      const json = (await res.json()) as { CHANNEL?: Record<string, unknown> };
      const c = json.CHANNEL ?? {};
      // RESULT: 1 = 방송중, 0 = 오프라인. 그 외 값은 안전하게 오프라인 취급.
      if (Number(c.RESULT) !== 1) return offlineState(BJ_ID);
      const bno = c.BNO != null ? String(c.BNO) : null;
      const cat = Array.isArray(c.CATEGORY_TAGS)
        ? ((c.CATEGORY_TAGS[0] as string) ?? null)
        : ((c.CATE as string) ?? null);
      return {
        isLive: true,
        channelId: BJ_ID,
        nickname: (c.BJNICK as string) ?? null,
        title: (c.TITLE as string) ?? null,
        category: cat,
        liveId: bno,
        watchUrl: bno
          ? `https://play.sooplive.com/${BJ_ID}/${bno}`
          : `https://www.sooplive.com/station/${BJ_ID}`,
        // BTIME = 방송 경과 초. 같은 응답 안에 있어 추가 요청 없이 '진짜 시작 시각'을 얻는다.
        startedAt: startedAtFromBtime(c.BTIME, Date.now())
      };
    } catch {
      return offlineState(BJ_ID);
    }
  }
};
