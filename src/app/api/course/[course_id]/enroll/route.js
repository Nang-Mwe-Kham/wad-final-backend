// src/app/api/course/[course_id]/enroll/route.js

import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getAuthUser } from "@/lib/auth";
import { errorResponse, successResponse, corsResponse } from "@/lib/utils";

export async function OPTIONS(req) {
  return corsResponse(req);
}

export async function POST(req, { params }) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return errorResponse("Authentication required", 401, req);
    }

    if (authUser.role !== "Student") {
      return errorResponse("Forbidden: Only students can enroll in courses", 403, req);
    }

    const { course_id } = await params;
    let objectId;
    try {
      objectId = new ObjectId(course_id);
    } catch {
      return errorResponse("Invalid course ID format", 400, req);
    }

    const db = await getDb();
    const course = await db.collection("courses").findOne({ _id: objectId });

    if (!course) {
      return errorResponse("Course not found", 404, req);
    }

    // Check course status
    if (course.status !== "Open") {
      return errorResponse(
        `Cannot enroll: Course status is '${course.status}'. Only 'Open' courses allow enrollment.`,
        400,
        req,
      );
    }

    const enrolledStudents = Array.isArray(course.enrolledStudents)
      ? course.enrolledStudents
      : [];

    // Check duplicate enrollment
    const alreadyEnrolled = enrolledStudents.some(
      (s) => s.studentId === authUser.id,
    );
    if (alreadyEnrolled) {
      return errorResponse(
        "You are already enrolled in this course.",
        400,
        req,
      );
    }

    // Check max student capacity
    if (enrolledStudents.length >= course.maxStudents) {
      return errorResponse(
        "Cannot enroll: This course has reached its maximum student capacity.",
        400,
        req,
      );
    }

    // Atomic enrollment update
    const newEnrollment = {
      studentId: authUser.id,
      username: authUser.username,
      email: authUser.email,
      enrolledAt: new Date(),
    };

    const updateResult = await db.collection("courses").updateOne(
      {
        _id: objectId,
        status: "Open",
        "enrolledStudents.studentId": { $ne: authUser.id },
        $expr: { $lt: [{ $size: "$enrolledStudents" }, "$maxStudents"] },
      },
      {
        $push: { enrolledStudents: newEnrollment },
        $set: { updatedAt: new Date() },
      },
    );

    if (updateResult.modifiedCount === 0) {
      return errorResponse(
        "Enrollment failed: Course may be full or closed.",
        400,
        req,
      );
    }

    const updated = await db.collection("courses").findOne({ _id: objectId });

    return successResponse(
      {
        message: "Successfully enrolled in course",
        course: {
          ...updated,
          id: updated._id.toString(),
          enrolledCount: updated.enrolledStudents.length,
          availableSeats: Math.max(
            0,
            updated.maxStudents - updated.enrolledStudents.length,
          ),
          isEnrolled: true,
        },
      },
      200,
      req,
    );
  } catch (error) {
    console.error("Enroll error:", error);
    return errorResponse("Failed to process enrollment", 500, req);
  }
}
