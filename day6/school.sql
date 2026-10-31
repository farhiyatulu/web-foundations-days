PRAGMA foreign_keys = ON;
CREATE TABLE students (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);CREATE TABLE enrolments (
  id         INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL,
  course_id  INTEGER NOT NULL,
  grade      TEXT,
  UNIQUE (student_id, course_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id)  REFERENCES courses(id)  ON DELETE CASCADE
);
CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);
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
SELECT courses.title, enrolments.grade
FROM students
JOIN enrolments ON enrolments.student_id = students.id
JOIN courses    ON courses.id = enrolments.course_id
WHERE students.name = 'Amina Otieno'
ORDER BY courses.title;
SELECT students.name, students.email, enrolments.grade
FROM courses
JOIN enrolments ON enrolments.course_id = courses.id
JOIN students   ON students.id = enrolments.student_id
WHERE courses.title = 'Databases'
ORDER BY students.name;
SELECT courses.title, COUNT(enrolments.id) AS student_count
FROM courses
LEFT JOIN enrolments ON enrolments.course_id = courses.id
GROUP BY courses.id
ORDER BY student_count DESC, courses.title;
SELECT students.name, students.email
FROM students
LEFT JOIN enrolments ON enrolments.student_id = students.id
WHERE enrolments.id IS NULL;
UPDATE enrolments
SET grade = 'B'
WHERE student_id = (SELECT id FROM students WHERE email = 'brian@example.com')
  AND course_id  = (SELECT id FROM courses  WHERE title = 'Intro to Python');
  SELECT students.name, courses.title, enrolments.grade
FROM enrolments
JOIN students ON students.id = enrolments.student_id
JOIN courses  ON courses.id  = enrolments.course_id
WHERE students.email = 'brian@example.com'