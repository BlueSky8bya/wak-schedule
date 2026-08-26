// 관심 하트 → 불꽃/왕관 배지 단계(단일 출처).
// 시청자 포스터(배지 표시)와 개발자 인사이트(기준 설명)가 같은 임계값을 쓰도록 여기 한 곳에 둔다.
//
// 단계는 "절대 하트 수"로만 정한다(비율 조건 없음). 예전엔 상위 단계에 "이 달 최다 대비 비율"을
// 함께 걸었는데, 그러면 '다른 일정'에 하트가 쌓여 최다치가 오를 때 이 일정의 비율이 떨어져 배지가
// 내려가/사라져 보였다("하트를 뺀 것도 아닌데 배지가 사라짐"). 절대 수만 쓰면 다른 일정의 하트가
// 이 일정 배지에 영향을 주지 않는다(단조 — 하트를 더하면 올라가기만, 남의 하트로 안 내려간다).
// 👑(최고 인기)는 이 달 최다치와 같은 일정에 붙는다. 공동 1위면 함께 왕관 → 동점을 만들어도
// 기존 왕관이 사라지지 않는다(엄밀히 더 높은 일정이 나오면 그때만 왕관이 옮겨간다).
// ── 규모 보정(T-8, 2026-08-26 사용자 결정) ─────────────────────────────────
// 기준 모수: 구독 4,800의 절반인 **실활동 2,400명**(사용자 지정). 임계값은 그 모수의
// 참여율로 산출한다 — 판정 자체는 여전히 '절대 하트 수'(위 단조 원칙 그대로)이고,
// 모수는 임계값을 뽑는 계산기일 뿐이다. 실제 하트 분포가 쌓이면 이 모수/비율만 다시
// 맞춘다(재보정 시 ACTIVE_FAN_BASE 또는 비율만 수정).
export const ACTIVE_FAN_BASE = 2400;
export const HEART_MIN = Math.round(ACTIVE_FAN_BASE * 0.01); // 24 — 1%: 배지 최소(노이즈 컷)
export const HEART_HOT = Math.round(ACTIVE_FAN_BASE * 0.03); // 72 — 3%: 🔥🔥 높은 관심
export const HEART_BLAZE = Math.round(ACTIVE_FAN_BASE * 0.08); // 192 — 8%: 🔥🔥🔥 폭발적
export const HEART_CROWN = Math.round(ACTIVE_FAN_BASE * 0.02); // 48 — 2%: 👑 최소(이 달 최다일 때)

export type HeartTier = { key: "warm" | "hot" | "blaze" | "top"; flames: string; label: string };

// isTop = 이 일정의 하트가 '이 달 최다'와 같은가(공동 1위 포함).
export function heartTier(count: number, isTop: boolean): HeartTier | null {
  if (count < HEART_MIN) {
    return null; // 너무 적으면 표시하지 않는다(노이즈 방지).
  }
  // 최고 인기 왕관 — 이 달 최다(공동 1위 포함) + 충분히 모임.
  if (isTop && count >= HEART_CROWN) {
    return { key: "top", flames: "👑", label: "최고 인기" };
  }
  // 상위 단계는 절대 하트 수만으로(남의 하트에 영향받지 않게).
  if (count >= HEART_BLAZE) {
    return { key: "blaze", flames: "🔥🔥🔥", label: "폭발적 관심" };
  }
  if (count >= HEART_HOT) {
    return { key: "hot", flames: "🔥🔥", label: "높은 관심" };
  }
  return { key: "warm", flames: "🔥", label: "관심" };
}
