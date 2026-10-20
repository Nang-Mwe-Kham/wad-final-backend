// seed.js
const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "online-course";

if (!uri) {
  console.error("Error: MONGODB_URI is not defined.");
  process.exit(1);
}

async function seed() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB:", uri);
    const db = client.db(dbName);

    // Collections
    const usersCollection = db.collection("users");
    const coursesCollection = db.collection("courses");

    // Clean existing data
    await usersCollection.deleteMany({});
    await coursesCollection.deleteMany({});
    console.log("Cleared existing users and courses.");

    const saltRounds = 10;
    const defaultPassword = "password123";
    const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

    // 3 Teachers and 3 Students
    const usersData = [
      {
        username: "teacher1",
        email: "teacher1@example.com",
        password: hashedPassword,
        role: "Teacher",
        createdAt: new Date(),
      },
      {
        username: "teacher2",
        email: "teacher2@example.com",
        password: hashedPassword,
        role: "Teacher",
        createdAt: new Date(),
      },
      {
        username: "teacher3",
        email: "teacher3@example.com",
        password: hashedPassword,
        role: "Teacher",
        createdAt: new Date(),
      },
      {
        username: "student1",
        email: "student1@example.com",
        password: hashedPassword,
        role: "Student",
        createdAt: new Date(),
      },
      {
        username: "student2",
        email: "student2@example.com",
        password: hashedPassword,
        role: "Student",
        createdAt: new Date(),
      },
      {
        username: "student3",
        email: "student3@example.com",
        password: hashedPassword,
        role: "Student",
        createdAt: new Date(),
      },
    ];

    const insertedUsers = await usersCollection.insertMany(usersData);
    console.log(`Inserted ${insertedUsers.insertedCount} users.`);

    const teachers = await usersCollection.find({ role: "Teacher" }).toArray();
    const students = await usersCollection.find({ role: "Student" }).toArray();

    // Map for easy reference
    const t1 = teachers.find((u) => u.username === "teacher1");
    const t2 = teachers.find((u) => u.username === "teacher2");
    const t3 = teachers.find((u) => u.username === "teacher3");

    const s1 = students.find((u) => u.username === "student1");
    const s2 = students.find((u) => u.username === "student2");
    const s3 = students.find((u) => u.username === "student3");

    const coursesData = [
      {
        courseName: "Web Application Development",
        duration: 30,
        topics: ["Next.js", "React", "Node.js", "MongoDB", "REST APIs"],
        price: 199,
        maxStudents: 10,
        status: "Open",
        teacherId: t1._id.toString(),
        teacherName: t1.username,
        teacherEmail: t1.email,
        enrolledStudents: [
          {
            studentId: s1._id.toString(),
            username: s1.username,
            email: s1.email,
            enrolledAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        courseName: "Fullstack JavaScript Mastery",
        duration: 45,
        topics: ["TypeScript", "Express", "Tailwind CSS", "JWT Auth"],
        price: 249,
        maxStudents: 5,
        status: "Open",
        teacherId: t1._id.toString(),
        teacherName: t1.username,
        teacherEmail: t1.email,
        enrolledStudents: [], // Zero enrollments - test delete!
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        courseName: "Data Structures & Algorithms",
        duration: 60,
        topics: ["Arrays", "Trees", "Graphs", "Dynamic Programming"],
        price: 149,
        maxStudents: 2,
        status: "Close",
        teacherId: t1._id.toString(),
        teacherName: t1.username,
        teacherEmail: t1.email,
        enrolledStudents: [
          {
            studentId: s2._id.toString(),
            username: s2.username,
            email: s2.email,
            enrolledAt: new Date(),
          },
          {
            studentId: s3._id.toString(),
            username: s3.username,
            email: s3.email,
            enrolledAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        courseName: "Advanced Cloud Architecture",
        duration: 20,
        topics: ["AWS", "Docker", "Kubernetes", "Microservices"],
        price: 299,
        maxStudents: 15,
        status: "Cancel",
        teacherId: t1._id.toString(),
        teacherName: t1.username,
        teacherEmail: t1.email,
        enrolledStudents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        courseName: "UI/UX Design with Figma",
        duration: 14,
        topics: ["Figma", "Design Systems", "Prototyping", "User Testing"],
        price: 99,
        maxStudents: 20,
        status: "Open",
        teacherId: t2._id.toString(),
        teacherName: t2.username,
        teacherEmail: t2.email,
        enrolledStudents: [
          {
            studentId: s1._id.toString(),
            username: s1.username,
            email: s1.email,
            enrolledAt: new Date(),
          },
          {
            studentId: s2._id.toString(),
            username: s2.username,
            email: s2.email,
            enrolledAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        courseName: "Python for Data Science",
        duration: 40,
        topics: ["Python", "Pandas", "NumPy", "Matplotlib"],
        price: 179,
        maxStudents: 1, // Full capacity testing!
        status: "Open",
        teacherId: t3._id.toString(),
        teacherName: t3.username,
        teacherEmail: t3.email,
        enrolledStudents: [
          {
            studentId: s3._id.toString(),
            username: s3.username,
            email: s3.email,
            enrolledAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const insertedCourses = await coursesCollection.insertMany(coursesData);
    console.log(`Inserted ${insertedCourses.insertedCount} courses.`);

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Seeding error:", error);
  } finally {
    await client.close();
  }
}

seed();
