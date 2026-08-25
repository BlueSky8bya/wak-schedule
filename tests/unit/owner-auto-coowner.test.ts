import { beforeEach, describe, expect, it, vi } from "vitest";

// CHG-20260826-008: OWNER_EMAIL 계정이 로그인 한 번으로 저장(RLS 공동 소유자)까지 되는지.
// 신뢰 기준은 env 하나 — 목록 밖 계정에는 어떤 DB 쓰기도 일어나면 안 된다.

const upsert = vi.fn(async () => ({ error: null }));
const maybeSingle = vi.fn(async () => ({ data: { id: "cal-1" } }));

vi.mock("@/lib/auth/admin", () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      if (table === "calendars") {
        return { select: () => ({ eq: () => ({ maybeSingle }) }) };
      }
      if (table === "calendar_co_owners") {
        return { upsert };
      }
      throw new Error(`unexpected table ${table}`);
    }
  })
}));

process.env.OWNER_EMAIL = "primary@example.com,second-owner@example.com";
const { ensureOwnerCoOwnerRegistration } = await import("@/lib/auth/owner-sync");

describe("OWNER_EMAIL 자동 공동 소유자 등록", () => {
  beforeEach(() => {
    upsert.mockClear();
    maybeSingle.mockClear();
  });

  it("목록의 계정(대소문자 무시)은 로그인 시 공동 소유자 upsert", async () => {
    await ensureOwnerCoOwnerRegistration("Second-Owner@Example.com", "uid-2");
    expect(upsert).toHaveBeenCalledWith(
      { calendar_id: "cal-1", owner_id: "uid-2" },
      { onConflict: "calendar_id,owner_id", ignoreDuplicates: true }
    );
  });

  it("목록 밖 계정은 DB에 아무것도 하지 않는다", async () => {
    await ensureOwnerCoOwnerRegistration("viewer@example.com", "uid-9");
    expect(maybeSingle).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("email/userId 없으면 no-op", async () => {
    await ensureOwnerCoOwnerRegistration(null, "uid-1");
    await ensureOwnerCoOwnerRegistration("primary@example.com", null);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("캘린더가 아직 없으면(시드 전) 조용히 통과", async () => {
    maybeSingle.mockResolvedValueOnce({ data: null } as never);
    await ensureOwnerCoOwnerRegistration("primary@example.com", "uid-1");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("upsert 실패해도 던지지 않는다(로그인을 막지 않음)", async () => {
    upsert.mockResolvedValueOnce({ error: { message: "boom" } } as never);
    await expect(
      ensureOwnerCoOwnerRegistration("primary@example.com", "uid-1")
    ).resolves.toBeUndefined();
  });
});
