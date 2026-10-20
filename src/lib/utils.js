// src/lib/utils.js

import { NextResponse } from "next/server";
import defaultCorsHeaders, { getCorsHeaders } from "./cors";

export function printExceptionLog(logMessage, error) {
  console.log(`==>${logMessage} Exception`);
  console.log(error);
}

export function corsResponse(req) {
  const headers = req ? getCorsHeaders(req) : defaultCorsHeaders;
  return new NextResponse(null, {
    status: 204,
    headers,
  });
}

export function errorResponse(message, status = 400, req) {
  const headers = req ? getCorsHeaders(req) : defaultCorsHeaders;
  return NextResponse.json(
    {
      message: message,
    },
    {
      status: status,
      headers: headers,
    },
  );
}

export function successResponse(jsonData, status = 200, req) {
  const headers = req ? getCorsHeaders(req) : defaultCorsHeaders;
  return NextResponse.json(jsonData, {
    status: status,
    headers: headers,
  });
}
