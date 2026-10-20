// src/app/api/course/route.js

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
      return errorResponse("Authentication required", 401, req);
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || searchParams.get("q") || "";
    const enrolledOnly =
      searchParams.get("enrolled") === "true" ||
      searchParams.get("filter") === "enrolled";
    const mineOnly =
      searchParams.get("mine") === "true" ||
      searchParams.get("filter") === "mine";

    const db = await getDb();
    let query = {};

    if (authUser.role === "Teacher") {
      // Teachers can view only their own courses
      query.teacherId = authUser.id;
    } else if (authUser.role === "Student") {
      // Students never see Cancelled courses
      query.status = { $ne: "Cancel" };

      if (enrolledOnly) {
        // Enrolled courses for this student
        query["enrolledStudents.studentId"] = authUser.id;
      }
    } else {
      return errorResponse("Invalid user role", 403, req);
    }

    // Filter by part of course name or teacher name
    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: "i" };
      query.$or = [{ courseName: regex }, { teacherName: regex }];
    }

    const courses = await db
      .collection("courses")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    const formattedCourses = courses.map((course) => {
      const isEnrolled = authUser.role === "Student" && Array.isArray(course.enrolledStudents)
        ? course.enrolledStudents.some((s) => s.studentId === authUser.id)
        : false;

      // If Student, don't expose full student details to them, but provide enrollment count and status
      const enrolledCount = Array.isArray(course.enrolledStudents)
        ? course.enrolledStudents.length
        : 0;

      return {
        ...course,
        id: course._id.toString(),
        enrolledCount,
        availableSeats: Math.max(0, (course.maxStudents || 0) - enrolledCount),
        isEnrolled,
        // Only teachers can view enrolled students list
        enrolledStudents: authUser.role === "Teacher" ? course.enrolledStudents || [] : undefined,
      };
    });

    return successResponse(formattedCourses, 200, req);
  } catch (error) {
    console.error("Get courses error:", error);
    return errorResponse("Failed to fetch courses", 500, req);
  }
}

export async function POST(req) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return errorResponse("Authentication required", 401, req);
    }

    if (authUser.role !== "Teacher") {
      return errorResponse("Forbidden: Only teachers can create courses", 403, req);
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

    const finalCourseName = (courseName || name || "").trim();
    const finalDuration = Number(duration);
    const finalPrice = Number(price);
    const finalMaxStudents = Number(maxStudents ?? maxStudent);
    const finalStatus = status || "Open";

    if (!finalCourseName) {
      return errorResponse("Course name is required", 400, req);
    }
    if (isNaN(finalDuration) || finalDuration <= 0) {
      return errorResponse("Duration must be a positive number of days", 400, req);
    }
    if (isNaN(finalPrice) || finalPrice < 0) {
      return errorResponse("Price must be a valid non-negative number", 400, req);
    }
    if (isNaN(finalMaxStudents) || finalMaxStudents <= 0) {
      return errorResponse("Max Student must be a positive number", 400, req);
    }
    if (!["Open", "Close", "Cancel"].includes(finalStatus)) {
      return errorResponse("Status must be Open, Close, or Cancel", 400, req);
    }

    // Process topics
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

    const newCourse = {
      courseName: finalCourseName,
      duration: finalDuration,
      topics: finalTopics,
      price: finalPrice,
      maxStudents: finalMaxStudents,
      status: finalStatus,
      teacherId: authUser.id,
      teacherName: authUser.username,
      teacherEmail: authUser.email,
      enrolledStudents: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const db = await getDb();
    const result = await db.collection("courses").insertOne(newCourse);

    return successResponse(
      {
        message: "Course created successfully",
        course: {
          ...newCourse,
          id: result.insertedId.toString(),
          _id: result.insertedId,
        },
      },
      201,
      req,
    );
  } catch (error) {
    console.error("Create course error:", error);
    return errorResponse("Failed to create course", 500, req);
  }
}