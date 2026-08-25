// 라이브 상태의 플랫폼 중립 표현 — 포스터/편집실은 이 모양만 안다.
//
// 왜 중립화했나: VIC(우왁굳) 원본은 SOOP 전용이었다. 이 프로젝트의 대상 스트리머는 플랫폼이
// 다를 수 있어(치지직 등) 공급자를 env로 갈아끼우게 했다. UI는 손대지 않고 lib/live/<provider>만
// 추가하면 된다.
export type LiveState = {
  isLive: boolean;
  channelId: string; // 플랫폼의 공개 채널/BJ 식별자(임베드 주소 조립용)
  nickname: string | null;
  title: string | null;
  category: string | null;
  // 방송 회차 식별자(SOOP의 bno, 치지직의 liveId 등). 임베드 주소에 필요할 때만 쓴다.
  liveId: string | null;
  watchUrl: string | null;
  // 실제 방송 시작 시각(ISO). 폴링이 늦어도 시작 시각은 정확해야 한다. 모르면 null.
  startedAt: string | null;
};

export type LiveProvider = {
  readonly name: string;
  readonly channelId: string;
  fetchLive(): Promise<LiveState>;
};

export function offlineState(channelId: string): LiveState {
  return {
    isLive: false,
    channelId,
    nickname: null,
    title: null,
    category: null,
    liveId: null,
    watchUrl: null,
    startedAt: null
  };
}
