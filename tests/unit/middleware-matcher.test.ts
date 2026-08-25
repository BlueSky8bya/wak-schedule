import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// 2026-08-26 발견 버그의 회귀 테스트.
//
// middleware.ts는 '탐색 가능한 페이지'의 인증 쿠키를 갱신한다(supabase.auth.getUser()).
// matcher가 제외하지 않는 경로는 요청 한 건마다 GoTrue를 왕복한다.
// 시청자는 /api/live를 25초마다 폴링한다(components/poster/use-live.ts) — 이게 제외되지
// 않으면 동접 20,000에서 초당 약 800건이 아무도 읽지 않는 사용자 조회에 쓰인다.
//
// 원래 버그: 제외 목록에 VIC 시절 이름(api/soop-live·api/presence)이 적혀 있었다. 둘 다 이
// 저장소에 없는 라우트라 아무것도 막지 못했고, 정작 /api/live는 그대로 통과했다.
// 그래서 이 테스트는 두 가지를 본다 — (1) 제외돼야 할 경로가 실제로 제외되는가,
// (2) 제외 목록에 적힌 api/* 이름이 실재하는 라우트인가(죽은 이름 재유입 차단).

const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

function readMatcher(): string {
  const src = readFileSync(join(repoRoot, "middleware.ts"), "utf8");
  const m = src.match(/matcher:\s*\[\s*("[^"]*")/);
  if (!m) throw new Error("middleware.ts에서 matcher 문자열을 찾지 못했다");
  // TS 문자열 리터럴의 이스케이프(\.)를 정규식 소스(\.)로 되돌린다.
  // TS 문자열 리터럴을 그대로 해석한다(JSON과 이스케이프 규칙이 같다).
  return JSON.parse(m[1]) as string;
}

const matcher = readMatcher();
const re = new RegExp(`^${matcher}$`);
const runs = (path: string) => re.test(path);

describe("middleware matcher — 무엇이 인증 쿠키 갱신을 통과하는가", () => {
  it("라이브 폴링(/api/live)은 미들웨어를 타지 않는다", () => {
    expect(runs("/api/live")).toBe(false);
  });

  it("공개 경계(/api/public/*)는 미들웨어를 타지 않는다", () => {
    expect(runs("/api/public/wak/events")).toBe(false);
  });

  it("정적 자산은 미들웨어를 타지 않는다", () => {
    expect(runs("/favicon.ico")).toBe(false);
    expect(runs("/_next/static/chunk.js")).toBe(false);
    expect(runs("/logo.svg")).toBe(false);
  });

  it("페이지와 세션이 필요한 라우트는 미들웨어를 탄다", () => {
    expect(runs("/")).toBe(true);
    expect(runs("/studio")).toBe(true);
    expect(runs("/studio/calendar/2026/8")).toBe(true);
    expect(runs("/login")).toBe(true);
    expect(runs("/api/studio-write")).toBe(true);
    expect(runs("/api/auth/login")).toBe(true);
  });

  // 죽은 이름 재유입 차단 — 제외 목록의 api/<name>은 실재 라우트여야 한다.
  it("제외 목록에 적힌 api/* 이름이 전부 실재한다", () => {
    const names = [...matcher.matchAll(/api\/([a-z0-9-]+)/g)].map((m) => m[1]);
    expect(names.length).toBeGreaterThan(0);
    const missing = names.filter((n) => !existsSync(join(repoRoot, "app", "api", n)));
    expect(missing, `app/api에 없는 라우트를 제외하고 있다: ${missing.join(", ")}`).toEqual([]);
  });
});
