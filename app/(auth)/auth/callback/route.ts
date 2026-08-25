import { NextResponse } from "next/server";
import { ensureOwnerCoOwnerRegistration } from "@/lib/auth/owner-sync";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { providerErrorToCode } from "@/lib/auth/auth-errors";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeNextPath(requestUrl.searchParams.get("next") ?? "/");

  // 동의 화면에서 취소하면 code 없이 ?error=access_denied 로 돌아온다.
  // 예전엔 이 경우 그냥 앱으로 되돌려보내 "설명 없이 다시 로그인 화면"이 됐다 →
  // 친절한 코드로 로그인 화면에 안내한다.
  const providerError = requestUrl.searchParams.get("error");
  if (providerError) {
    return redirectToLogin(request, providerErrorToCode(providerError), next);
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = (await supabase?.auth.exchangeCodeForSession(code)) ?? {};

    if (error) {
      // 날 것의 supabase 메시지를 URL에 노출하지 않는다 — 안정적인 코드만.
      return redirectToLogin(request, "exchange", next);
    }

    // [WH-CHANGE v0.1.0 | FIX | 2026-08-26 | CHG-20260826-008]
    // Reason: 이전 코드는 VIC 비공개 레이어의 unlock_sessions를 지웠는데 그 테이블은 이
    //   프로젝트 DB에 없다 — 매 로그인마다 죽은 테이블에 쿼리를 날리고 있었다. 그 자리를
    //   OWNER_EMAIL 계정의 RLS 공동 소유자 자동 등록으로 교체한다(로그인 한 번 = 저장까지 됨).
    const user = data?.user ?? data?.session?.user;
    if (user?.id) {
      await ensureOwnerCoOwnerRegistration(user.email, user.id);
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}

function redirectToLogin(request: Request, errorCode: string, next: string) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", errorCode);
  if (next && next !== "/") {
    loginUrl.searchParams.set("next", next);
  }
  return NextResponse.redirect(loginUrl);
}

function sanitizeNextPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}
