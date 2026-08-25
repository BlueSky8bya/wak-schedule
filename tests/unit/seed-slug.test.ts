import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CALENDAR_SLUG } from "@/lib/config/site";

const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

// 2026-08-26 T-1 첫 적용에서 잡은 버그의 회귀 테스트.
//
// 시드 8개가 VIC 시절 slug('vic')를 참조하고 있었다 — 캘린더가 잘못된 슬러그로
// 만들어지고 팔레트 시드는 조용히 no-op 됐다. SQL은 lib/config/site.ts를 import할 수
// 없으므로, 시드에 등장하는 slug 리터럴이 단일 출처(CALENDAR_SLUG)와 일치하는지
// 여기서 기계로 잡는다.
describe("db/seeds — slug 리터럴은 CALENDAR_SLUG와 일치", () => {
  const dir = join(repoRoot, "db", "seeds");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql"))) {
    it(file, () => {
      const src = readFileSync(join(dir, file), "utf8");
      // slug = 'x' / slug, ... values (..., 'x', ...) 패턴 중 명시적 slug 비교·대입만 본다.
      const refs = [...src.matchAll(/slug\s*=\s*'([a-z0-9-]+)'/g)].map((m) => m[1]);
      for (const slug of refs) {
        expect(slug, `${file}: slug '${slug}' !== CALENDAR_SLUG '${CALENDAR_SLUG}'`).toBe(
          CALENDAR_SLUG
        );
      }
    });
  }

  it("0002 캘린더 insert의 values 슬러그도 일치", () => {
    const src = readFileSync(join(dir, "0002_calendar_and_defaults.sql"), "utf8");
    const m = src.match(/values \(v_owner, '([a-z0-9-]+)'/);
    expect(m?.[1]).toBe(CALENDAR_SLUG);
  });
});
