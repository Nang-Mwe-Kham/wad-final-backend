// src/app/api/user/route.js

import bcrypt from "bcrypt";
import { getDb } from "@/lib/mongodb";
import { errorResponse, successResponse, corsResponse } from "@/lib/utils";

export async function OPTIONS(req) {
  return corsResponse(req);
}

export async function GET(req) {
  try {
    const db = await getDb();
    const users = await db
      .collection("users")
      .find({}, { projection: { password: 0 } })
      .toArray();

    const formattedUsers = users.map((u) => ({
      ...u,
      id: u._id.toString(),
    }));

    return successResponse(formattedUsers, 200, req);
  } catch (error) {
    console.error("Get users error:", error);
    return errorResponse("Failed to fetch users", 500, req);
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { username, email, password, role } = body;

    if (!username || !email || !password || !role) {
      return errorResponse(
        "Username, email, password, and role are required",
        400,
        req,
      );
    }

    if (!["Teacher", "Student"].includes(role)) {
      return errorResponse("Role must be either 'Teacher' or 'Student'", 400, req);
    }

    const db = await getDb();
    const existing = await db.collection("users").findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { username: username.trim() },
      ],
    });

    if (existing) {
      return errorResponse("Username or email already exists", 400, req);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      createdAt: new Date(),
    };

    const result = await db.collection("users").insertOne(newUser);

    return successResponse(
      {
        message: "User created successfully",
        user: {
          id: result.insertedId.toString(),
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
        },
      },
      201,
      req,
    );
  } catch (error) {
    console.error("Create user error:", error);
    return errorResponse("Failed to create user", 500, req);
  }
}