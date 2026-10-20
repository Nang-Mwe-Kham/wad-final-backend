// src/lib/auth.js

import jwt from "jsonwebtoken";
import {
  X_HEADER_USER_ID,
  X_HEADER_USER_NAME,
  X_HEADER_USER_EMAIL,
  X_HEADER_USER_ROLE,
} from "./constant";

const JWT_SECRET = process.env.JWT_SECRET || "wad_online_course_secret_key_2026";

export function signJWT(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function getTokenFromRequest(req) {
  // Try cookie first
  let token = req.cookies?.get?.("token")?.value;
  if (!token && typeof req.cookies?.get === "function") {
    token = req.cookies.get("token");
  }

  // Then try Authorization header
  if (!token && req.headers?.get) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      token = authHeader.substring(7).trim();
    }
  }

  return token;
}

export function verifyJWT(req) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return null;
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (err) {
    return null;
  }
}

export function getAuthUser(req) {
  // Check headers set by middleware first
  const userId = req.headers?.get?.(X_HEADER_USER_ID);
  if (userId) {
    return {
      id: userId,
      _id: userId,
      username: req.headers.get(X_HEADER_USER_NAME),
      email: req.headers.get(X_HEADER_USER_EMAIL),
      role: req.headers.get(X_HEADER_USER_ROLE),
    };
  }

  // Fallback to direct JWT verification
  const user = verifyJWT(req);
  if (user) {
    return {
      id: user.id || user._id,
      _id: user.id || user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
  }

  return null;
}