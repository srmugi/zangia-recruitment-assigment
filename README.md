# Training Exam System Demo

A complete recruitment assignment demo for a training exam system with separate Admin and User flows, built with plain Node.js, Express, SQLite, HTML, CSS, and JavaScript.

## Stack

- Node.js
- Express.js
- SQLite via Node's built-in `node:sqlite`
- `express-session`
- password hashing via Node's built-in `node:crypto`
- Plain HTML, CSS, and JavaScript

## Features

- User registration with frontend and backend validation
- User login by email or phone
- Session-based authentication with role protection
- Admin course CRUD
- Admin question CRUD with exactly one correct answer and 1-5 incorrect answers
- User course grid and exam start flow
- Random selection of up to 10 questions per exam
- Randomized answer order on every exam start
- Timer that starts on first answer or 5 seconds after load
- Auto-submit on timeout and manual early submit
- User result page with summary and per-question review
- Admin results view per course
- Seeded admin account and demo courses/questions

## Project Structure

```text
project-root/
  server.js
  package.json
  README.md
  /db
  /middleware
  /routes
  /controllers
  /services
  /public
```

## Setup

```bash
npm install
node server.js
```

Then open:

```text
http://localhost:3000
```

## Default Admin Credentials

- Email: `admin@demo.com`
- Password: `admin123`

## User Pages

- `/pages/login.html`
- `/pages/register.html`
- `/pages/courses.html`
- `/pages/exam.html`
- `/pages/result.html`

## Admin Pages

- `/pages/admin-login.html`
- `/pages/admin-courses.html`
- `/pages/admin-questions.html`
- `/pages/admin-results.html`

## Notes

- Database schema is created automatically on first run in `db/app.db`.
- This project expects Node `23.4+` so it can use the built-in `node:sqlite` module without experimental flags.
- Demo seed data includes 3 courses and 12 questions per course.
- Course and media fields use URL inputs instead of file upload to keep the demo simple and stable.
- The backend never sends `is_correct` to the exam frontend; correctness is evaluated only on submit.
- Sessions use the default in-memory session store because this is a local demo assignment, not a production deployment.

## Assumptions

- Phone validation accepts 10-15 digits with an optional leading `+`.
- Result review shows the selected answer and correct answer after submission.
- Exam duration sent from the frontend reflects the actual timer start behavior required by the assignment.
