// src/proxy.js

import { NextResponse } from "next/server";
import { verifyJWT } from "./lib/auth";
import { getCorsHeaders } from "./lib/cors";
import {
  X_HEADER_USER_EMAIL,
  X_HEADER_USER_ID,
  X_HEADER_USER_NAME,
  X_HEADER_USER_ROLE,
} from "./lib/constant";

export function proxy(request) {
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: getCorsHeaders(request),
    });
  }

  const { pathname } = request.nextUrl;

  // Allow public authentication endpoints
  if (
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/register"
  ) {
    return NextResponse.next();
  }

  const user = verifyJWT(request);

  if (!user) {
    return NextResponse.json(
      {
        message: "Unauthorized Request",
      },
      {
        status: 401,
        headers: getCorsHeaders(request),
      },
    );
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(X_HEADER_USER_ID, user.id || user._id || "");
  requestHeaders.set(X_HEADER_USER_EMAIL, user.email || "");
  requestHeaders.set(X_HEADER_USER_NAME, user.username || "");
  requestHeaders.set(X_HEADER_USER_ROLE, user.role || "");

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/api/:path*"],
};
