import { NextResponse } from "next/server";
import { verifyGatePass } from "@/lib/schedules/security-actions";

// 최초공개(떡밥) 편집 게이트의 비밀번호 검증 라우트.
// fork 이후 이 라우트가 없어서 게이트 fetch가 404로 떨어져 어떤 비밀번호도 통과할 수
// 없었다(2026-08-26 복구). 경로 이름은 VIC 시절 클라이언트 코드와의 호환 — 이 프로젝트에
// 비공개 레이어는 없고, verifyOnly 검증만 한다(세션 grant 발급 없음).
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    passcode?: string;
    verifyOnly?: boolean;
  };
  const pass = (body.passcode ?? "").trim();
  if (!pass) {
    return NextResponse.json({ error: "비밀번호를 입력해 주세요." }, { status: 400 });
  }
  const res = await verifyGatePass(pass);
  if (!res.ok) {
    return NextResponse.json({ error: res.error ?? "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
