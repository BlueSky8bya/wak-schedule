import { offlineState, type LiveProvider, type LiveState } from "@/lib/live/types";

// 치지직(CHZZK) 라이브 상태. 공개 조회 엔드포인트라 인증이 필요 없지만 비공식이므로,
// 실패하면 예외를 던지지 않고 조용히 오프라인으로 떨어뜨린다(라이브 배지는 부가 정보지
// 화면의 전제조건이 아니다 — 여기서 throw하면 포스터 전체가 흔들린다).
const CHANNEL_ID = process.env.CHZZK_CHANNEL_ID ?? "";
const API = (id: string) => `https://api.chzzk.naver.com/service/v1/channels/${id}/live-detail`;

type ChzzkResponse = {
  content?: {
    status?: string; // "OPEN" | "CLOSE"
    liveId?: number | string;
    liveTitle?: string | null;
    liveCategoryValue?: string | null;
    openDate?: string | null; // "YYYY-MM-DD HH:mm:ss" (KST)
    channel?: { channelName?: string | null };
  } | null;
};

// openDate는 타임존 없는 KST 벽시계 문자열이다 → +09:00을 붙여 ISO(UTC)로 바꾼다.
// 미래값·하루 넘게 과거인 값은 이상치로 버린다(시계 오차·API 이변 방어).
export function openDateToIso(openDate: unknown, nowMs: number): string | null {
  if (typeof openDate !== "string" || !openDate.trim()) return null;
  const ms = Date.parse(`${openDate.trim().replace(" ", "T")}+09:00`);
  if (!Number.isFinite(ms)) return null;
  if (ms > nowMs + 5 * 60 * 1000 || ms < nowMs - 24 * 3600 * 1000) return null;
  return new Date(ms).toISOString();
}

export const chzzkProvider: LiveProvider = {
  name: "chzzk",
  channelId: CHANNEL_ID,
  async fetchLive(): Promise<LiveState> {
    if (!CHANNEL_ID) return offlineState("");
    try {
      const res = await fetch(API(CHANNEL_ID), {
        headers: { "User-Agent": "Mozilla/5.0" },
        cache: "no-store",
        signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) return offlineState(CHANNEL_ID);
      const json = (await res.json()) as ChzzkResponse;
      const c = json.content;
      if (!c || c.status !== "OPEN") return offlineState(CHANNEL_ID);
      return {
        isLive: true,
        channelId: CHANNEL_ID,
        nickname: c.channel?.channelName ?? null,
        title: c.liveTitle ?? null,
        category: c.liveCategoryValue ?? null,
        liveId: c.liveId != null ? String(c.liveId) : null,
        watchUrl: `https://chzzk.naver.com/live/${CHANNEL_ID}`,
        startedAt: openDateToIso(c.openDate, Date.now())
      };
    } catch {
      return offlineState(CHANNEL_ID);
    }
  }
};
