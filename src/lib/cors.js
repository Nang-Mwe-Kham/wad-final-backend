// src/lib/cors.js

export function getCorsHeaders(req) {
  let origin = req?.headers?.get?.("origin");
  if (!origin) {
    origin = process.env.NODE_ENV === "development" ? "http://localhost:5173" : "https://production.app";
  }
  return {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-id, x-user-username, x-user-email",
    "Access-Control-Max-Age": "86400",
  };
}

let corsHeaders = {
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Origin":
    process.env.NODE_ENV === "development"
      ? "http://localhost:5173"
      : "https://production.app",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-id, x-user-username, x-user-email",
  "Access-Control-Max-Age": "86400",
};

export default corsHeaders;
