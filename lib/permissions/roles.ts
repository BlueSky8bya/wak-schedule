import type { MembershipRole } from "@/lib/domain/schedule-types";

// 이 프로젝트의 역할은 셋뿐이다: owner(우왁굳=관리자) · developer(시스템 유지보수자) · viewer(시청자).
// VIC(우왁굳) 원본에 있던 manager/worker(신뢰 멤버)와 비공개 레이어는 여기 없다 — 왁굳형 운영은
// 관리자 한 명이 일정을 쓰고 나머지는 전부 시청자다. 그래서 "누가 볼 수 있나"를 판정할 자리가
// 아예 없고(모든 일정이 공개), 판정이 필요한 건 "누가 쓸 수 있나" 하나다.

// 플랫폼 개발자 / 슈퍼관리자: 전체 캘린더를 가로질러 시스템을 유지보수한다.
export function isDeveloper(role: MembershipRole) {
  return role === "developer";
}

// 소유자(스트리머) 또는 개발자(시스템 유지보수자)만 일정·태그를 편집할 수 있다.
// 서버 액션은 클라이언트 게이트와 별개로 항상 이 검사를 다시 한다(클라 게이트는 UX일 뿐).
export function canEditSchedule(role: MembershipRole) {
  return role === "owner" || role === "developer";
}
