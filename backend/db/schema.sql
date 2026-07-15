-- NextStep database schema + seed data (MySQL 8).
-- Run with:  npm run db:init   (from the backend folder)
--
-- Re-running is safe: it drops and recreates the tables with fresh seed data,
-- which mirrors the old "restarting the server resets the demo data" behaviour.

CREATE DATABASE IF NOT EXISTS nextstep
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nextstep;

-- Drop in an order that respects the (logical) foreign keys.
DROP TABLE IF EXISTS sorting_items;
DROP TABLE IF EXISTS sorting_sets;
DROP TABLE IF EXISTS quiz_questions;
DROP TABLE IF EXISTS plan_lessons;
DROP TABLE IF EXISTS study_plans;
DROP TABLE IF EXISTS calendar_tasks;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS habits;
DROP TABLE IF EXISTS admin_requests;
DROP TABLE IF EXISTS post_upvotes;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS users;

-- ---- Tables -------------------------------------------------------------
-- Column names are kept in camelCase to match the JSON the API already sends,
-- so `SELECT *` returns rows the frontend understands without any remapping.

CREATE TABLE users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  email      VARCHAR(190) NOT NULL UNIQUE,
  password   VARCHAR(190) NOT NULL,   -- plain text for the prototype; hash with bcrypt later
  yearLevel  VARCHAR(40),
  diploma    VARCHAR(160),
  role       ENUM('user','admin') NOT NULL DEFAULT 'user',
  createdAt  DATE
);

CREATE TABLE posts (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  userId          INT,
  author          VARCHAR(120),
  authorYear      VARCHAR(40),
  title           VARCHAR(255) NOT NULL,
  category        VARCHAR(80),
  content         TEXT NOT NULL,
  suggestedAction VARCHAR(255),
  status          ENUM('approved','pending','rejected') NOT NULL DEFAULT 'pending',
  upvotes         INT NOT NULL DEFAULT 0,
  createdAt       DATE
);

CREATE TABLE comments (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  postId     INT NOT NULL,
  userId     INT,
  author     VARCHAR(120),
  authorYear VARCHAR(40),
  `text`     TEXT NOT NULL,
  createdAt  DATE
);

CREATE TABLE post_upvotes (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  postId    INT NOT NULL,
  userId    INT NOT NULL,
  createdAt DATE DEFAULT (CURRENT_DATE)
);

CREATE TABLE habits (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  userId       INT,
  sourcePostId INT NULL,
  name         VARCHAR(255) NOT NULL,
  frequency    VARCHAR(40),
  status       ENUM('active','completed','paused') NOT NULL DEFAULT 'active',
  progress     INT NOT NULL DEFAULT 0,
  createdAt    DATE
);

CREATE TABLE calendar_tasks (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  userId    INT,
  habitId   INT NULL,
  title     VARCHAR(255) NOT NULL,
  date      DATE NOT NULL,
  time      VARCHAR(5),
  completed TINYINT(1) NOT NULL DEFAULT 0
);

CREATE TABLE admin_requests (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  userId     INT,
  name       VARCHAR(120),
  reason     VARCHAR(500),
  status     ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reviewedBy VARCHAR(120) NULL,
  reviewedAt DATE NULL
);

CREATE TABLE reports (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  postId     INT,
  reportedBy VARCHAR(120),
  reason     VARCHAR(500),
  status     ENUM('open','resolved') NOT NULL DEFAULT 'open'
);

-- Study plans: a plan is a subject/module a student is taking; each has lessons.
-- The plan's `name` (the subject) is what the Flash Quiz matches against the
-- quiz_questions bank, so the quiz only offers topics the student is studying.
CREATE TABLE study_plans (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  userId    INT NOT NULL,
  name      VARCHAR(120) NOT NULL,
  module    VARCHAR(160),
  createdAt DATE
);

CREATE TABLE plan_lessons (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  planId    INT NOT NULL,
  title     VARCHAR(255) NOT NULL,
  completed TINYINT(1) NOT NULL DEFAULT 0
);

-- Flash Quiz question bank, keyed by `subject`. A subject is matched
-- (case-insensitively) to a student's study-plan names to decide which topics
-- appear in the game. correctIndex is 0..3 into (optionA, optionB, optionC, optionD).
CREATE TABLE quiz_questions (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  subject      VARCHAR(120) NOT NULL,
  question     VARCHAR(400) NOT NULL,
  optionA      VARCHAR(200) NOT NULL,
  optionB      VARCHAR(200) NOT NULL,
  optionC      VARCHAR(200) NOT NULL,
  optionD      VARCHAR(200) NOT NULL,
  correctIndex TINYINT NOT NULL,
  INDEX idx_quiz_subject (subject)
);

-- Speed Sorting Challenge. A "set" is a collection of terms that each belong to
-- a category; the game asks the player to sort terms into the right category
-- bins against the clock. Built-in sets (userId NULL) are seeded per subject and
-- matched to study plans; upload sets are parsed from a student's revision file.
CREATE TABLE sorting_sets (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  userId    INT NULL,
  title     VARCHAR(160) NOT NULL,
  subject   VARCHAR(120) NULL,   -- matched to study plans; NULL = general
  source    ENUM('builtin','upload') NOT NULL DEFAULT 'builtin',
  filename  VARCHAR(200) NULL,
  createdAt DATE
);

CREATE TABLE sorting_items (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  setId    INT NOT NULL,
  term     VARCHAR(160) NOT NULL,
  category VARCHAR(120) NOT NULL,
  INDEX idx_sort_set (setId)
);

-- ---- Seed data (matches the original in-memory mock content) ------------

INSERT INTO users (id, name, email, password, yearLevel, diploma, role, createdAt) VALUES
  (1, 'Alex Tan',      'alex@rp.edu.sg',  'password123', 'Year 2', 'Diploma in Information Technology', 'user',  '2026-01-05'),
  (2, 'Priya Nair',    'priya@rp.edu.sg', 'password123', 'Year 3', 'Diploma in Information Technology', 'user',  '2026-01-06'),
  (3, 'Admin Officer', 'admin@rp.edu.sg', 'admin123',    'Year 3', 'Diploma in Information Technology', 'admin', '2026-01-02');

INSERT INTO posts (id, userId, author, authorYear, title, category, content, suggestedAction, status, upvotes, createdAt) VALUES
  (1, 2, 'Priya Nair', 'Year 3', 'How I recovered after failing my first internship interview', 'Internship rejection',
   'I failed my first interview because my GitHub was almost empty. I started building one small project every week and writing a short README for each. Three months later my portfolio looked completely different and I got an offer.',
   'Build one small project every week and update my portfolio', 'approved', 42, '2026-02-10'),
  (2, 2, 'Priya Nair', 'Year 3', 'A simple exam prep routine that actually works', 'Exam preparation',
   'Instead of cramming, I studied one topic per day and did a 20-minute recap of the previous day first. Spaced repetition made a huge difference for my grades.',
   'Study one topic daily and recap yesterday''s topic for 20 minutes', 'approved', 35, '2026-02-14'),
  (3, 1, 'Alex Tan', 'Year 2', 'Beating procrastination with the 2-minute rule', 'Time management',
   'Whenever a task felt too big, I told myself to just do 2 minutes of it. Starting is the hardest part, and most times I kept going well past the 2 minutes.',
   'Start every hard task with just 2 focused minutes', 'approved', 28, '2026-02-18'),
  (4, 1, 'Alex Tan', 'Year 2', 'How I finally kept a consistent coding practice', 'Programming practice',
   'I committed to solving one easy algorithm problem every weekday morning before class. Keeping it small and daily made it stick.',
   'Solve one easy coding problem every weekday morning', 'approved', 19, '2026-02-20'),
  (5, 1, 'Alex Tan', 'Year 2', 'My scholarship application checklist', 'Scholarship application',
   'Here is the checklist I used: strong personal statement, two recommendation letters, a clear CCA record, and proof of community work. Start at least a month early.',
   'Prepare scholarship documents one month before the deadline', 'pending', 0, '2026-02-24'),
  (6, 2, 'Priya Nair', 'Year 3', 'Working well in project teams', 'Project teamwork',
   'We used a shared task board and a 10-minute daily check-in. Everyone knew what to do and nothing was forgotten at the last minute.',
   'Run a 10-minute daily team check-in during projects', 'pending', 0, '2026-02-25');

INSERT INTO comments (id, postId, userId, author, authorYear, `text`, createdAt) VALUES
  (1, 1, 1, 'Alex Tan',      'Year 2', 'This motivated me to finally start committing daily. Thank you!',  '2026-02-11'),
  (2, 1, 3, 'Admin Officer', 'Year 3', 'Great, honest advice. Portfolios matter a lot for interviews.',    '2026-02-12'),
  (3, 2, 1, 'Alex Tan',      'Year 2', 'The recap-first idea is genius. Trying it this week.',              '2026-02-15');

INSERT INTO habits (id, userId, sourcePostId, name, frequency, status, progress, createdAt) VALUES
  (1, 1, 3,    'Start hard tasks with 2 focused minutes', 'Daily',    'active',    60, '2026-02-19'),
  (2, 1, 4,    'Solve one coding problem each weekday',    'Weekdays', 'active',    40, '2026-02-21'),
  (3, 1, NULL, 'Read 10 pages of a textbook',             'Daily',    'paused',    25, '2026-02-22'),
  (4, 1, 2,    'Recap yesterday''s topic for 20 minutes', 'Daily',    'completed', 100, '2026-02-16');

-- A run of completed daily study tasks (2026-06-25 → 07-12) gives Alex an
-- 18-day streak on the Progress page. Today (07-13) is left incomplete on
-- purpose, so the "keep your streak alive" nudge shows and the last three rows
-- also populate the dashboard's "Upcoming plans".
INSERT INTO calendar_tasks (id, userId, habitId, title, date, time, completed) VALUES
  (1,  1, 2,    'Solve one coding problem',         '2026-06-25', '08:00', 1),
  (2,  1, 4,    'Recap yesterday''s topic',         '2026-06-26', '20:00', 1),
  (3,  1, 1,    '2-minute start on assignment',     '2026-06-27', '14:00', 1),
  (4,  1, 3,    'Read 10 pages of a textbook',      '2026-06-28', '21:00', 1),
  (5,  1, 2,    'Solve one coding problem',         '2026-06-29', '08:00', 1),
  (6,  1, 4,    'Recap yesterday''s topic',         '2026-06-30', '20:00', 1),
  (7,  1, 2,    'Solve one coding problem',         '2026-07-01', '08:00', 1),
  (8,  1, 1,    '2-minute start on assignment',     '2026-07-02', '14:00', 1),
  (9,  1, 3,    'Read 10 pages of a textbook',      '2026-07-03', '21:00', 1),
  (10, 1, 2,    'Solve one coding problem',         '2026-07-04', '08:00', 1),
  (11, 1, 4,    'Recap yesterday''s topic',         '2026-07-05', '20:00', 1),
  (12, 1, 2,    'Solve one coding problem',         '2026-07-06', '08:00', 1),
  (13, 1, 1,    '2-minute start on assignment',     '2026-07-07', '14:00', 1),
  (14, 1, 3,    'Read 10 pages of a textbook',      '2026-07-08', '21:00', 1),
  (15, 1, 2,    'Solve one coding problem',         '2026-07-09', '08:00', 1),
  (16, 1, 4,    'Recap yesterday''s topic',         '2026-07-10', '20:00', 1),
  (17, 1, 2,    'Solve one coding problem',         '2026-07-11', '08:00', 1),
  (18, 1, 1,    '2-minute start on assignment',     '2026-07-12', '14:00', 1),
  (19, 1, 2,    'Solve one coding problem',         '2026-07-13', '08:00', 0),
  (20, 1, NULL, 'Build one small project (weekly)', '2026-07-14', '19:00', 0),
  (21, 1, 4,    'Recap yesterday''s topic',         '2026-07-15', '20:00', 0);

INSERT INTO admin_requests (id, userId, name, reason, status, reviewedBy, reviewedAt) VALUES
  (1, 2, 'Priya Nair', 'I help moderate the study-habits category and would like moderator access.', 'pending', NULL, NULL);

INSERT INTO reports (id, postId, reportedBy, reason, status) VALUES
  (1, 4, 'Priya Nair', 'Possible duplicate of another coding-practice post.', 'open');

-- Alex's study plans. Their subjects (Programming, Networking, Databases,
-- Operating Systems) all have a matching quiz_questions bank below, so the Flash
-- Quiz will offer exactly these topics.
INSERT INTO study_plans (id, userId, name, module, createdAt) VALUES
  (1, 1, 'Programming',       'C271 Programming Fundamentals', '2026-01-10'),
  (2, 1, 'Networking',        'C246 Networking Essentials',    '2026-01-12'),
  (3, 1, 'Databases',         'C255 Database Systems',         '2026-01-14'),
  (4, 1, 'Operating Systems', 'C270 Operating Systems',        '2026-01-16');

INSERT INTO plan_lessons (id, planId, title, completed) VALUES
  (1,  1, 'Variables & data types', 1),
  (2,  1, 'Loops & functions',      1),
  (3,  1, 'Arrays & lists',         0),
  (4,  1, 'Recursion',              0),
  (5,  2, 'The OSI model',          1),
  (6,  2, 'IP addressing',          0),
  (7,  2, 'Routing & switching',    0),
  (8,  3, 'SELECT queries',         1),
  (9,  3, 'Joins',                  1),
  (10, 3, 'Normalization',          0),
  (11, 4, 'Processes & threads',    1),
  (12, 4, 'CPU scheduling',         0),
  (13, 4, 'Memory management',      0);

-- Flash Quiz question bank. Subjects here are matched to study-plan names.
INSERT INTO quiz_questions (subject, question, optionA, optionB, optionC, optionD, correctIndex) VALUES
  -- Programming
  ('Programming', 'Which data structure works on a Last-In-First-Out basis?', 'Queue', 'Stack', 'Array', 'Tree', 1),
  ('Programming', 'What does a ''for'' loop primarily provide?', 'Decision making', 'Repetition', 'Data storage', 'Error handling', 1),
  ('Programming', 'What is the time complexity of binary search?', 'O(n)', 'O(n squared)', 'O(log n)', 'O(1)', 2),
  ('Programming', 'Which keyword defines a reusable block of code?', 'loop', 'function', 'class', 'return', 1),
  ('Programming', 'A variable that only exists inside a function is called…', 'Global', 'Static', 'Local', 'Constant', 2),
  ('Programming', 'Which symbol denotes a single-line comment in JavaScript?', '#', '//', '<!--', '**', 1),
  -- Networking
  ('Networking', 'Which layer of the OSI model handles routing?', 'Transport', 'Network', 'Data Link', 'Session', 1),
  ('Networking', 'What does ''IP'' stand for?', 'Internet Protocol', 'Internal Process', 'Instant Packet', 'Input Port', 0),
  ('Networking', 'Which device forwards packets between different networks?', 'Switch', 'Hub', 'Router', 'Repeater', 2),
  ('Networking', 'How many bits are in an IPv4 address?', '16', '32', '64', '128', 1),
  ('Networking', 'Which protocol is connection-oriented and reliable?', 'UDP', 'ICMP', 'TCP', 'ARP', 2),
  ('Networking', 'What port does HTTPS use by default?', '21', '80', '443', '25', 2),
  -- Databases
  ('Databases', 'Which SQL keyword retrieves data from a table?', 'GET', 'SELECT', 'FETCH', 'PULL', 1),
  ('Databases', 'A column that uniquely identifies each row is a…', 'Foreign key', 'Index', 'Primary key', 'View', 2),
  ('Databases', 'Which clause filters rows in a query?', 'ORDER BY', 'GROUP BY', 'WHERE', 'HAVING', 2),
  ('Databases', 'What does normalization mainly reduce?', 'Speed', 'Redundancy', 'Security', 'Storage cost only', 1),
  ('Databases', 'Which JOIN returns only matching rows in both tables?', 'LEFT JOIN', 'INNER JOIN', 'FULL JOIN', 'CROSS JOIN', 1),
  -- Operating Systems
  ('Operating Systems', 'Which component decides which process uses the CPU next?', 'Compiler', 'CPU scheduler', 'Linker', 'Loader', 1),
  ('Operating Systems', 'Which is NOT a typical process state?', 'Ready', 'Running', 'Waiting', 'Compiling', 3),
  ('Operating Systems', 'Virtual memory lets a system…', 'Delete files', 'Use disk as extra RAM', 'Overclock the CPU', 'Encrypt data', 1),
  ('Operating Systems', 'Which is a required condition for deadlock?', 'Mutual exclusion', 'Infinite loops', 'High CPU usage', 'Fast disk', 0),
  ('Operating Systems', 'What unit does the OS schedule for execution?', 'File', 'Process', 'Folder', 'Driver', 1),
  -- Study Skills (available if a student adds this as a plan)
  ('Study Skills', 'The Pomodoro technique alternates focus with…', 'Naps', 'Short breaks', 'Snacks', 'Music', 1),
  ('Study Skills', 'Recalling information from memory instead of re-reading is…', 'Cramming', 'Active recall', 'Skimming', 'Highlighting', 1),
  ('Study Skills', 'Spacing revision over days rather than one session is…', 'Massed practice', 'Spaced repetition', 'Interleaving', 'Chunking', 1),
  ('Study Skills', 'Which is the healthiest study habit?', 'All-nighters', 'Consistent daily reviews', 'Multitasking', 'Skipping breaks', 1),
  ('Study Skills', 'Teaching a topic to someone else mainly improves…', 'Speed', 'Understanding', 'Typing', 'Grades only', 1);

-- Speed Sorting sets. Subject-tagged ones (Programming … Operating Systems) match
-- Alex's study plans; the NULL-subject ones (Animals, Chemistry) are general and
-- always available. Upload sets get added at runtime by students.
INSERT INTO sorting_sets (id, userId, title, subject, source, filename, createdAt) VALUES
  (1, NULL, 'Programming Concepts',            'Programming',       'builtin', NULL, '2026-01-10'),
  (2, NULL, 'Networking Essentials',           'Networking',        'builtin', NULL, '2026-01-10'),
  (3, NULL, 'Database Basics',                 'Databases',         'builtin', NULL, '2026-01-10'),
  (4, NULL, 'Operating Systems',               'Operating Systems', 'builtin', NULL, '2026-01-10'),
  (5, NULL, 'Animal Classes',                  NULL,                'builtin', NULL, '2026-01-10'),
  (6, NULL, 'Chemistry: Acids, Bases & Salts', NULL,                'builtin', NULL, '2026-01-10');

INSERT INTO sorting_items (setId, term, category) VALUES
  -- Programming
  (1, 'let score = 0',            'Variable'),
  (1, 'const name = "Ada"',       'Variable'),
  (1, 'int count;',               'Variable'),
  (1, 'function add(a, b)',       'Function'),
  (1, 'def greet():',             'Function'),
  (1, 'return total',             'Function'),
  (1, 'for (i = 0; i < n; i++)',  'Loop'),
  (1, 'while (running)',          'Loop'),
  (1, 'items.forEach(...)',       'Loop'),
  (1, 'if (x > 5)',               'Condition'),
  (1, 'else if (y)',              'Condition'),
  (1, 'switch (day)',             'Condition'),
  -- Networking
  (2, 'Router',        'Device'),
  (2, 'Switch',        'Device'),
  (2, 'Firewall',      'Device'),
  (2, 'TCP',           'Protocol'),
  (2, 'HTTP',          'Protocol'),
  (2, 'DNS',           'Protocol'),
  (2, 'IPv4 address',  'Addressing'),
  (2, 'MAC address',   'Addressing'),
  (2, 'Subnet mask',   'Addressing'),
  -- Databases
  (3, 'SELECT',       'SQL Command'),
  (3, 'INSERT',       'SQL Command'),
  (3, 'UPDATE',       'SQL Command'),
  (3, 'PRIMARY KEY',  'Constraint'),
  (3, 'FOREIGN KEY',  'Constraint'),
  (3, 'NOT NULL',     'Constraint'),
  (3, 'INNER JOIN',   'Join'),
  (3, 'LEFT JOIN',    'Join'),
  (3, 'CROSS JOIN',   'Join'),
  -- Operating Systems
  (4, 'Ready',                    'Process State'),
  (4, 'Running',                  'Process State'),
  (4, 'Waiting',                  'Process State'),
  (4, 'Round Robin',              'Scheduler'),
  (4, 'First-Come First-Served',  'Scheduler'),
  (4, 'Priority',                 'Scheduler'),
  (4, 'Paging',                   'Memory'),
  (4, 'Segmentation',             'Memory'),
  (4, 'Swapping',                 'Memory'),
  -- Animals
  (5, 'Dog',        'Mammal'),
  (5, 'Whale',      'Mammal'),
  (5, 'Bat',        'Mammal'),
  (5, 'Snake',      'Reptile'),
  (5, 'Lizard',     'Reptile'),
  (5, 'Crocodile',  'Reptile'),
  (5, 'Eagle',      'Bird'),
  (5, 'Penguin',    'Bird'),
  (5, 'Owl',        'Bird'),
  -- Chemistry
  (6, 'HCl',         'Acid'),
  (6, 'H2SO4',       'Acid'),
  (6, 'Citric acid', 'Acid'),
  (6, 'NaOH',        'Base'),
  (6, 'KOH',         'Base'),
  (6, 'Ammonia',     'Base'),
  (6, 'NaCl',        'Salt'),
  (6, 'KNO3',        'Salt'),
  (6, 'CaCO3',       'Salt');
