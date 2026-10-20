// src/app/api/user/[user_id]/route.js

import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { errorResponse, successResponse, corsResponse } from "@/lib/utils";

export async function OPTIONS(req) {
  return corsResponse(req);
}

export async function GET(req, { params }) {
  try {
    const { user_id } = await params;

    let filter;
    try {
      filter = { _id: new ObjectId(user_id) };
    } catch {
      filter = { username: user_id };
    }

    const db = await getDb();
    const user = await db
      .collection("users")
      .findOne(filter, { projection: { password: 0 } });

    if (!user) {
      return errorResponse("User not found", 404, req);
    }

    return successResponse(
      {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
      },
      200,
      req,
    );
  } catch (error) {
    console.error("Get user error:", error);
    return errorResponse("Failed to fetch user", 500, req);
  }
}
