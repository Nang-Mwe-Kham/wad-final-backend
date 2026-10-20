// src/app/api/auth/login/route.js

import bcrypt from "bcrypt";
import { getDb } from "@/lib/mongodb";
import { signJWT } from "@/lib/auth";
import { errorResponse, successResponse, corsResponse } from "@/lib/utils";

export async function OPTIONS(req) {
  return corsResponse(req);
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { username, email, emailOrUsername, password } = body;

    const identifier = (emailOrUsername || email || username || "").trim();

    if (!identifier || !password) {
      return errorResponse("Username/Email and password are required", 400, req);
    }

    const db = await getDb();
    const user = await db.collection("users").findOne({
      $or: [
        { email: { $regex: `^${identifier}$`, $options: "i" } },
        { username: identifier },
      ],
    });

    if (!user) {
      return errorResponse("Invalid credentials", 401, req);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return errorResponse("Invalid credentials", 401, req);
    }

    const tokenPayload = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const token = signJWT(tokenPayload);

    const response = successResponse(
      {
        message: "Login successful",
        token,
        user: tokenPayload,
      },
      200,
      req,
    );

    // Set HTTP-only Cookie
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse("Internal server error during login", 500, req);
  }
}