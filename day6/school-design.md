# School database design

## Tables

- **students** – one row per student. Columns: `id` (primary key), `name`, `email` (unique, so two students cannot share an address) and `created_at`.
- **courses** – one row per course. Columns: `id` (primary key), `title` and `credits` (must be greater than 0).
- **enrolments** – one row per student-on-course. Columns: `id` (primary key), `student_id` (foreign key to `students.id`), `course_id` (foreign key to `courses.id`), `grade` (empty until the student is graded) and `enrolled_on`. A `UNIQUE (student_id, course_id)` rule stops the same student enrolling on the same course twice.

## Relationships

- **One-to-many:** one student has many enrolments, and one course has many enrolments. Each enrolment belongs to exactly one student and exactly one course, which is why it holds two foreign keys.
- **Many-to-many:** students and courses. A student can take many courses, and a course can have many students.

A join table is needed because a single column cannot hold this relationship properly. A comma-separated list of course ids inside `students` would be hard to search and update and would break the rule that each column holds one value. Copying student details onto every course would repeat data and let it become inconsistent. The `enrolments` table solves this by storing each pairing as its own row. It is also the natural home for the grade, because a grade belongs to the pairing of one student and one course, not to either of them alone.

## Index

I would add an index on `enrolments(course_id)`. The question "who is on this course?" and the per-course student count both filter or group by `course_id`. Without an index the database scans every enrolment; with one it jumps straight to the matching rows. The `UNIQUE (student_id, course_id)` rule already creates an index that serves lookups starting from `student_id`, so `course_id` is the one that still needs its own. The cost is that inserts and updates on `enrolments` become slightly slower and the index takes extra space, which is a fair trade because reading enrolments happens far more often than writing them.

## SQL or NoSQL?

I would choose SQL. The data is clearly structured (students, courses, enrolments), the relationships between them are central to the system, and correctness matters: grades and enrolments must never be duplicated, orphaned or inconsistent. A relational database enforces these rules itself through foreign keys, `UNIQUE` and `NOT NULL`, and answers questions such as "students per course" or "students with no enrolments" with simple `JOIN` and `GROUP BY` queries. A document database would force me either to embed courses inside each student, duplicating course details and making course-wide questions awkward, or to rebuild relationships in application code. NoSQL would become more attractive only if the data turned very flexible or reached a scale that one relational database could not handle, and a school system is unlikely to need either.
