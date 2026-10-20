// src/app/api/course/[course_id]/route.js

import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getAuthUser } from "@/lib/auth";
import { errorResponse, successResponse, corsResponse } from "@/lib/utils";

export async function OPTIONS(req) {
  return corsResponse(req);
}

export async function GET(req, { params }) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return errorResponse("Authentication required", 401, req);
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

    // Role-based restrictions
    if (authUser.role === "Teacher") {
      // Teachers can view and update only their own courses
      if (course.teacherId !== authUser.id) {
        return errorResponse("Forbidden: You can only view your own courses", 403, req);
      }
    } else if (authUser.role === "Student") {
      // Students cannot view cancelled courses
      if (course.status === "Cancel") {
        return errorResponse("Course not found", 404, req);
      }
    }

    const enrolledStudents = Array.isArray(course.enrolledStudents)
      ? course.enrolledStudents
      : [];
    const enrolledCount = enrolledStudents.length;
    const availableSeats = Math.max(0, (course.maxStudents || 0) - enrolledCount);
    const isEnrolled = enrolledStudents.some((s) => s.studentId === authUser.id);

    const formattedCourse = {
      ...course,
      id: course._id.toString(),
      enrolledCount,
      availableSeats,
      isEnrolled,
      // Only teachers see the list of enrolled students
      enrolledStudents: authUser.role === "Teacher" ? enrolledStudents : undefined,
    };

    return successResponse(formattedCourse, 200, req);
  } catch (error) {
    console.error("Get course error:", error);
    return errorResponse("Failed to fetch course details", 500, req);
  }
}

export async function PUT(req, { params }) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return errorResponse("Authentication required", 401, req);
    }

    if (authUser.role !== "Teacher") {
      return errorResponse("Forbidden: Only teachers can update courses", 403, req);
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

    // Ownership check: Teachers can update only their own courses
    if (course.teacherId !== authUser.id) {
      return errorResponse("Forbidden: You can only update your own courses", 403, req);
    }

    const body = await req.json();
    const {
      courseName,
      name,
      duration,
      topics,
      price,
      maxStudents,
      maxStudent,
      status,
    } = body;

    const updateFields = {
      updatedAt: new Date(),
    };

    if (courseName || name) {
      updateFields.courseName = (courseName || name).trim();
    }

    if (duration !== undefined) {
      const dur = Number(duration);
      if (isNaN(dur) || dur <= 0) {
        return errorResponse("Duration must be a positive number of days", 400, req);
      }
      updateFields.duration = dur;
    }

    if (price !== undefined) {
      const p = Number(price);
      if (isNaN(p) || p < 0) {
        return errorResponse("Price must be a valid non-negative number", 400, req);
      }
      updateFields.price = p;
    }

    if (maxStudents !== undefined || maxStudent !== undefined) {
      const maxS = Number(maxStudents ?? maxStudent);
      const currentEnrolled = Array.isArray(course.enrolledStudents)
        ? course.enrolledStudents.length
        : 0;

      if (isNaN(maxS) || maxS <= 0) {
        return errorResponse("Max Student must be a positive number", 400, req);
      }
      if (maxS < currentEnrolled) {
        return errorResponse(
          `Cannot reduce Max Students below currently enrolled count (${currentEnrolled})`,
          400,
          req,
        );
      }
      updateFields.maxStudents = maxS;
    }

    if (status !== undefined) {
      if (!["Open", "Close", "Cancel"].includes(status)) {
        return errorResponse("Status must be Open, Close, or Cancel", 400, req);
      }
      updateFields.status = status;
    }

    if (topics !== undefined) {
      let finalTopics = [];
      if (Array.isArray(topics)) {
        finalTopics = topics.map((t) => String(t).trim()).filter(Boolean);
      } else if (typeof topics === "string") {
        finalTopics = topics
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      }
      if (finalTopics.length === 0) {
        return errorResponse("At least one topic is required", 400, req);
      }
      updateFields.topics = finalTopics;
    }

    await db
      .collection("courses")
      .updateOne({ _id: objectId }, { $set: updateFields });

    const updatedCourse = await db
      .collection("courses")
      .findOne({ _id: objectId });

    return successResponse(
      {
        message: "Course updated successfully",
        course: {
          ...updatedCourse,
          id: updatedCourse._id.toString(),
        },
      },
      200,
      req,
    );
  } catch (error) {
    console.error("Update course error:", error);
    return errorResponse("Failed to update course", 500, req);
  }
}

export async function DELETE(req, { params }) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return errorResponse("Authentication required", 401, req);
    }

    if (authUser.role !== "Teacher") {
      return errorResponse("Forbidden: Only teachers can delete courses", 403, req);
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

    // Ownership check: Teachers can delete only their own courses
    if (course.teacherId !== authUser.id) {
      return errorResponse("Forbidden: You can only delete your own courses", 403, req);
    }

    // Restriction: Delete the Teacher's own course only when no Student has enrolled
    const enrolledCount = Array.isArray(course.enrolledStudents)
      ? course.enrolledStudents.length
      : 0;

    if (enrolledCount > 0) {
      return errorResponse(
        `Cannot delete course: ${enrolledCount} student(s) have already enrolled in this course.`,
        400,
        req,
      );
    }

    await db.collection("courses").deleteOne({ _id: objectId });

    return successResponse(
      {
        message: "Course deleted successfully",
      },
      200,
      req,
    );
  } catch (error) {
    console.error("Delete course error:", error);
    return errorResponse("Failed to delete course", 500, req);
  }
}