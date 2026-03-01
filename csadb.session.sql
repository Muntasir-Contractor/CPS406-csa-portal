CREATE TABLE student_application(
    student_id INTEGER PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
    status_updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
