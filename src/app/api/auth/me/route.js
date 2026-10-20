// src/app/api/auth/me/route.js

import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getAuthUser } from "@/lib/auth";
import { errorResponse, successResponse, corsResponse } from "@/lib/utils";

export async function OPTIONS(req) {
  return corsResponse(req);
}

export async function GET(req) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return errorResponse("Unauthorized", 401, req);
    }

    const db = await getDb();
    let user = null;
    try {
      user = await db.collection("users").findOne(
        { _id: new ObjectId(authUser.id) },
        { projection: { password: 0 } },
      );
    } catch {
      user = await db.collection("users").findOne(
        { email: authUser.email },
        { projection: { password: 0 } },
      );
    }

    if (!user) {
      return errorResponse("User not found", 404, req);
    }

    return successResponse(
      {
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
      200,
      req,
    );
  } catch (error) {
    console.error("Auth me error:", error);
    return errorResponse("Failed to fetch authenticated user", 500, req);
  }
}
