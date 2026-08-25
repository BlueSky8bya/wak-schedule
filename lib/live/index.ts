import { chzzkProvider } from "@/lib/live/chzzk";
import { soopProvider } from "@/lib/live/soop";
import { offlineState, type LiveProvider, type LiveState } from "@/lib/live/types";

export type { LiveState } from "@/lib/live/types";

// 방송 플랫폼은 숲(SOOP)이 기본이다. 다른 플랫폼으로 옮기면 LIVE_PROVIDER env만 바꾼다.
// 라이브 기능 자체가 조용히 꺼진다 — 배포 초기에 채널 id를 모르는 상태에서도 사이트는 정상 동작한다.
const NONE: LiveProvider = {
  name: "none",
  channelId: "",
  fetchLive: async () => offlineState("")
};

function pickProvider(): LiveProvider {
  switch ((process.env.LIVE_PROVIDER ?? "soop").toLowerCase()) {
    case "chzzk":
      return chzzkProvider.channelId ? chzzkProvider : NONE;
    case "soop":
      return soopProvider.channelId ? soopProvider : NONE;
    default:
      return soopProvider.channelId ? soopProvider : NONE;
  }
}

export const liveProvider = pickProvider();

export function fetchLiveState(): Promise<LiveState> {
  return liveProvider.fetchLive();
}
