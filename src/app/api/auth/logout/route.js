// src/app/api/auth/logout/route.js

import { successResponse, corsResponse } from "@/lib/utils";

export async function OPTIONS(req) {
  return corsResponse(req);
}

export async function POST(req) {
  const response = successResponse({ message: "Logout successful" }, 200, req);
  response.cookies.delete("token");
  return response;
}