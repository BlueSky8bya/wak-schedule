"use server";

import { createHash } from "node:crypto";
import { resolveCurrentActor } from "@/lib/auth/actor";
import { createSupabaseAdminClient } from "@/lib/auth/admin";
import { canEditSchedule } from "@/lib/permissions/roles";
import { CALENDAR_SLUG } from "@/lib/config/site";

// 최초공개(떡밥) 게이트 비밀번호 (0062). 해시만 저장 — sha256(calendar_id || passcode).
// 초기 비밀번호는 '0724'(왁굳형 생일). 변경은 보안 탭에서. 게이트 검증 라우트
// (/api/unlock-private-layer)와 이 액션이 같은 해시 규칙을 쓴다.
// 캐시 무효화 없음 — 관리 전용 데이터(공개 DTO 무관, BR-CACHE-001 EXCEPT 등재 사유).

const INITIAL_PASS = "0724";
// 보안 탭 접근 자격자 목록에서 숨길 운영·테스트 계정(사용자 결정 2026-08-26) —
// 권한은 그대로, 표시만 뺀다. 왁굳형에게 보여줄 목록에 내부 계정이 섞이지 않게.
const HIDDEN_GATE_EMAILS = new Set(["whiteheaven231233@gmail.com", "blackspace665@gmail.com"]);
const PASS_RE = /^\d{4,12}$/;

function hashPass(calendarId: string, pass: string): string {
  return createHash("sha256").update(`${calendarId}${pass}`).digest("hex");
}

async function gateContext() {
  const actor = await resolveCurrentActor();
  if (!canEditSchedule(actor.role)) {
    return { error: "owner 또는 developer만 쓸 수 있습니다." } as const;
  }
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return { error: "저장소 연결이 설정되지 않았습니다." } as const;
  }
  const { data } = await admin
    .from("calendars")
    .select("id, gate_pass_hash, gate_pass_updated_at")
    .eq("slug", CALENDAR_SLUG)
    .maybeSingle();
  if (!data) {
    return { error: "캘린더를 찾을 수 없습니다." } as const;
  }
  return {
    admin,
    calendarId: data.id as string,
    storedHash: (data.gate_pass_hash as string | null) ?? null,
    updatedAt: (data.gate_pass_updated_at as string | null) ?? null
  } as const;
}

// 게이트 검증(라우트에서 사용). 저장된 해시가 없으면 초기 비밀번호와 비교한다.
export async function verifyGatePass(pass: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await gateContext();
  if ("error" in ctx && ctx.error) {
    return { ok: false, error: ctx.error };
  }
  if (!("calendarId" in ctx)) {
    return { ok: false, error: "확인 실패" };
  }
  const expected = ctx.storedHash ?? hashPass(ctx.calendarId, INITIAL_PASS);
  if (hashPass(ctx.calendarId, pass) !== expected) {
    return { ok: false, error: "비밀번호가 올바르지 않습니다." };
  }
  return { ok: true };
}

export type GateAccessPerson = { email: string; role: "owner" | "developer" };
export type GateInfo = {
  isInitial: boolean;
  updatedAt: string | null; // 마지막 변경(없으면 초기 상태)
  owners: GateAccessPerson[];
  developers: GateAccessPerson[];
};
export type GateInfoResult = { ok: true; data: GateInfo } | { ok: false; error: string };

// 보안 탭 표시용 — 아직 초기 비밀번호(0724)인지.
export async function getGateInfoAction(): Promise<GateInfoResult> {
  const ctx = await gateContext();
  if ("error" in ctx && ctx.error) {
    return { ok: false, error: ctx.error };
  }
  if (!("calendarId" in ctx)) {
    return { ok: false, error: "확인 실패" };
  }
  const isInitial =
    ctx.storedHash === null || ctx.storedHash === hashPass(ctx.calendarId, INITIAL_PASS);
  // 접근 자격자 — 게이트 비밀번호를 아는 사람(관리자 OWNER_EMAIL 목록·공동 소유자 + 개발자).
  const { getOwnerEmails } = await import("@/lib/auth/config");
  const owners = new Set<string>(getOwnerEmails());
  const { data: coRows } = await ctx.admin
    .from("calendar_co_owners")
    .select("owner_id")
    .eq("calendar_id", ctx.calendarId);
  const coIds = (((coRows ?? []) as { owner_id: string }[]) ?? []).map((r) => r.owner_id);
  for (const id of coIds.slice(0, 10)) {
    try {
      const { data: u } = await ctx.admin.auth.admin.getUserById(id);
      const email = u?.user?.email?.toLowerCase();
      if (email) owners.add(email);
    } catch {
      /* 조회 실패한 계정은 목록에서 생략 */
    }
  }
  const { data: devRows } = await ctx.admin.from("platform_admins").select("email");
  const developers = (((devRows ?? []) as { email: string }[]) ?? []).map((r) => ({
    email: r.email,
    role: "developer" as const
  }));
  return {
    ok: true,
    data: {
      isInitial,
      updatedAt: ctx.updatedAt,
      owners: [...owners]
        .filter((email) => !HIDDEN_GATE_EMAILS.has(email))
        .map((email) => ({ email, role: "owner" as const })),
      developers: developers.filter((d) => !HIDDEN_GATE_EMAILS.has(d.email))
    }
  };
}

export type GatePassChangeResult = { ok: true } | { ok: false; error: string };

// 비밀번호 변경 — 현재 비밀번호 확인 후 교체.
export async function changeGatePassAction(input: {
  current: string;
  next: string;
}): Promise<GatePassChangeResult> {
  const ctx = await gateContext();
  if ("error" in ctx && ctx.error) {
    return { ok: false, error: ctx.error };
  }
  if (!("calendarId" in ctx)) {
    return { ok: false, error: "확인 실패" };
  }
  const next = input.next.trim();
  if (!PASS_RE.test(next)) {
    return { ok: false, error: "새 비밀번호는 숫자 4~12자리로 해주세요." };
  }
  const expected = ctx.storedHash ?? hashPass(ctx.calendarId, INITIAL_PASS);
  if (hashPass(ctx.calendarId, input.current.trim()) !== expected) {
    return { ok: false, error: "현재 비밀번호가 올바르지 않습니다." };
  }
  const { error } = await ctx.admin
    .from("calendars")
    .update({
      gate_pass_hash: hashPass(ctx.calendarId, next),
      gate_pass_updated_at: new Date().toISOString()
    })
    .eq("id", ctx.calendarId);
  if (error) {
    return { ok: false, error: "저장에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }
  return { ok: true };
}
