import { createServerClient } from "@supabase/ssr";
import type { SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/auth/config";

export async function middleware(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next({
      request
    });
  }

  let response = NextResponse.next({
    request
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, options, value }) =>
            response.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  await supabase.auth.getUser();

  return response;
}

// [WH-CHANGE v0.1.0 | FIX | 2026-08-26 | CHG-20260826-001]
// Reason: matcher 제외 목록이 VIC 시절 라우트 이름(api/soop-live·api/presence)을 막고 있었다.
//   이 저장소에 그 둘은 없고, 실제로 시청자가 25초마다 두드리는 것은 /api/live다
//   (components/poster/use-live.ts). 제외되지 않아 폴링 한 건마다 아래 getUser()가 GoTrue를
//   왕복했다 — 동접 20,000이면 초당 약 800건이 아무도 읽지 않는 사용자 조회에 쓰인다.
// Constraint: 미들웨어가 하는 일은 '탐색 가능한 페이지'의 인증 쿠키 갱신(getUser)뿐이다.
//   쿠키 갱신이 필요 없는 표면만 제외한다:
//     · /api/live    — 완전 공개(액터를 읽지 않는다)
//     · /api/public/* — 공개 경계. 공개 로더만 쓴다
//   /api/studio-write는 제외하지 않는다(편집 쓰기 창구 — 세션이 필요하다).
// Related: tests/unit/middleware-matcher.test.ts, docs/agent/decisions/ADR-0004.md
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/live|api/public|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
