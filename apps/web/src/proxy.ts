import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/sign-in", "/sign-up"];
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check for better-auth session cookie (cookie name: "better-auth.session_token")
  const sessionCookie =
    req.cookies.get("better-auth.session_token") ??
    req.cookies.get("__Secure-better-auth.session_token");

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!sessionCookie) {
    // No cookie at all — redirect to sign-in if trying to access protected route
    if (!isPublic) {
      const url = req.nextUrl.clone();
      url.pathname = "/sign-in";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Cookie present — verify with the server
  try {
    const resp = await fetch(`${API_URL}/api/auth/get-session`, {
      headers: { cookie: req.headers.get("cookie") ?? "" },
      cache: "no-store",
    });

    const session = await resp.json();

    if (!session?.user) {
      if (!isPublic) {
        const url = req.nextUrl.clone();
        url.pathname = "/sign-in";
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }

    // Authenticated — redirect away from auth pages
    if (isPublic) {
      const url = req.nextUrl.clone();
      url.pathname = "/chat";
      return NextResponse.redirect(url);
    }
  } catch {
    // Server unreachable — allow through, page will handle error state
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};
