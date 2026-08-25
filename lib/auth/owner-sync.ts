import { createSupabaseAdminClient } from "@/lib/auth/admin";
import { isOwnerEmail, normalizeEmail } from "@/lib/auth/config";
import { CALENDAR_SLUG } from "@/lib/config/site";

// [WH-CHANGE v0.1.0 | FEAT | 2026-08-26 | CHG-20260826-008]
// Reason: OWNER_EMAIL에 등록된 계정(예: 왁굳형 추정 계정)이 "로그인 한 번"으로 저장까지
//   전부 되게 한다. RLS는 이메일이 아니라 auth.users UUID를 보는데 UUID는 첫 로그인에야
//   생긴다 — 그래서 이메일만으로는 공동 소유자 행을 미리 만들 수 없다. 이 훅이 로그인
//   콜백에서 그 간극을 자동으로 메운다(전에는 첫 로그인 후 seeds/0013 수동 재실행 필요).
// Constraint: 권한의 신뢰 기준은 기존과 동일하게 OWNER_EMAIL env 하나다 — 새 권한 경로를
//   만들지 않는다. 여기서는 '추가'만 한다(멱등). 목록에서 빠진 계정의 '제거'(완전 동기화)는
//   seeds/0013의 몫. 실패해도 로그인을 막지 않는다(다음 로그인이 재시도 기회).
// Related: docs/agent/decisions/ADR-0002-three-roles.md
export async function ensureOwnerCoOwnerRegistration(
  rawEmail: string | null | undefined,
  userId: string | null | undefined
): Promise<void> {
  const email = normalizeEmail(rawEmail);
  if (!email || !userId || !isOwnerEmail(email)) {
    return;
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return;
  }

  try {
    const { data: calendar } = await admin
      .from("calendars")
      .select("id")
      .eq("slug", CALENDAR_SLUG)
      .maybeSingle();
    if (!calendar) {
      return; // 캘린더 시드 전 — 0002가 주 소유자를 잡을 때 함께 해소된다.
    }

    const { error } = await admin
      .from("calendar_co_owners")
      .upsert(
        { calendar_id: calendar.id, owner_id: userId },
        { onConflict: "calendar_id,owner_id", ignoreDuplicates: true }
      );
    if (error) {
      console.warn("[auth] owner co-owner auto-registration failed:", error.message);
    }
  } catch (err) {
    console.warn("[auth] owner co-owner auto-registration failed:", err);
  }
}
