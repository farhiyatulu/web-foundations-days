-- Day 6 assignment: school database (SQLite)
-- Run this whole file in an SQLite playground such as sqliteonline.com.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------

CREATE TABLE students (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE courses (
  id      INTEGER PRIMARY KEY,
  title   TEXT NOT NULL,
  credits INTEGER NOT NULL DEFAULT 3 CHECK (credits > 0)
);

-- Join table: one row = one student enrolled on one course.
CREATE TABLE enrolments (
  id          INTEGER PRIMARY KEY,
  student_id  INTEGER NOT NULL,
  course_id   INTEGER NOT NULL,
  grade       TEXT,                              -- NULL until graded
  enrolled_on TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (student_id, course_id),                -- no double enrolment
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id)  REFERENCES courses(id)  ON DELETE CASCADE
);

-- Index: finding all students on a course filters by course_id.
-- (The UNIQUE pair already covers lookups that start from student_id.)
CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);

-- ---------------------------------------------------------------
-- SAMPLE DATA
-- ---------------------------------------------------------------

INSERT INTO students (name, email) VALUES
  ('Amina Otieno',    'amina@example.com'),
  ('Brian Kamau',     'brian@example.com'),
  ('Cynthia Wanjiru', 'cynthia@example.com'),
  ('David Mwangi',    'david@example.com');       -- will have no enrolments

INSERT INTO courses (title, credits) VALUES
  ('Web Foundations',   4),
  ('Databases',         3),
  ('Intro to Python',   3);

INSERT INTO enrolments (student_id, course_id, grade) VALUES
  (1, 1, 'A'),
  (1, 2, 'B'),
  (2, 1, 'B'),
  (2, 3, NULL),
  (3, 2, 'A'),
  (3, 3, 'C');

-- ---------------------------------------------------------------
-- QUERIES
-- ---------------------------------------------------------------

-- 1. All courses for one student (by name)
SELECT courses.title, enrolments.grade
FROM students
JOIN enrolments ON enrolments.student_id = students.id
JOIN courses    ON courses.id = enrolments.course_id
WHERE students.name = 'Amina Otieno'
ORDER BY courses.title;

-- 2. All students on one course
SELECT students.name, students.email, enrolments.grade
FROM courses
JOIN enrolments ON enrolments.course_id = courses.id
JOIN students   ON students.id = enrolments.student_id
WHERE courses.title = 'Databases'
ORDER BY students.name;

-- 3. Number of students per course (LEFT JOIN keeps empty courses)
SELECT courses.title, COUNT(enrolments.id) AS student_count
FROM courses
LEFT JOIN enrolments ON enrolments.course_id = courses.id
GROUP BY courses.id
ORDER BY student_count DESC, courses.title;

-- 4. Students who have no enrolments
SELECT students.name, students.email
FROM students
LEFT JOIN enrolments ON enrolments.student_id = students.id
WHERE enrolments.id IS NULL;

-- 5. Update one enrolment's grade (Brian's grade in Intro to Python)
UPDATE enrolments
SET grade = 'B'
WHERE student_id = (SELECT id FROM students WHERE email = 'brian@example.com')
  AND course_id  = (SELECT id FROM courses  WHERE title = 'Intro to Python');

-- Check the update worked
SELECT students.name, courses.title, enrolments.grade
FROM enrolments
JOIN students ON students.id = enrolments.student_id
JOIN courses  ON courses.id  = enrolments.course_id
WHERE students.email = 'brian@example.com';