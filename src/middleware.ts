import { NextResponse, type NextRequest } from "next/server";
import { readSession, SESSION_COOKIE_NAME } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await readSession(token);

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!session || session.role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  if (
    pathname.startsWith("/tenant") &&
    pathname !== "/tenant/login" &&
    pathname !== "/tenant/verify"
  ) {
    if (!session || session.role !== "tenant") {
      const url = req.nextUrl.clone();
      url.pathname = "/tenant/login";
      return NextResponse.redirect(url);
    }
  }

  if (
    pathname.startsWith("/contractor") &&
    pathname !== "/contractor/login" &&
    pathname !== "/contractor/signup"
  ) {
    if (!session || session.role !== "contractor") {
      const url = req.nextUrl.clone();
      url.pathname = "/contractor/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/tenant/:path*", "/contractor/:path*"],
};
