const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const { hashPassword } = require("../utils/password");

const dbFile = path.join(__dirname, "app.db");
const schemaFile = path.join(__dirname, "schema.sql");

const rawDb = new DatabaseSync(dbFile);
rawDb.exec("PRAGMA foreign_keys = ON");

function normalizeRunResult(result) {
  return {
    ...result,
    lastInsertRowid: Number(result.lastInsertRowid),
    changes: Number(result.changes)
  };
}

const db = {
  exec(sql) {
    return rawDb.exec(sql);
  },
  prepare(sql) {
    const statement = rawDb.prepare(sql);
    return {
      run(...params) {
        return normalizeRunResult(statement.run(...params));
      },
      get(...params) {
        return statement.get(...params);
      },
      all(...params) {
        return statement.all(...params);
      }
    };
  },
  transaction(fn) {
    return (...args) => {
      rawDb.exec("BEGIN");
      try {
        const result = fn(...args);
        rawDb.exec("COMMIT");
        return result;
      } catch (error) {
        rawDb.exec("ROLLBACK");
        throw error;
      }
    };
  }
};

function initializeDatabase() {
  const schema = fs.readFileSync(schemaFile, "utf8");
  db.exec(schema);
  seedAdmin();
  seedDemoData();
}

function seedAdmin() {
  const existingAdmin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (existingAdmin) {
    return;
  }

  const passwordHash = hashPassword("admin123");
  db.prepare(
    `INSERT INTO users (first_name, last_name, phone, email, password_hash, role)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run("Demo", "Admin", "9999999999", "admin@demo.com", passwordHash, "admin");
}

function seedDemoData() {
  const courseCount = db.prepare("SELECT COUNT(*) AS count FROM courses").get().count;
  if (courseCount > 0) {
    return;
  }

  const courses = [
    {
      name: "JavaScript Basics",
      image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
      questions: buildSeedQuestions("JavaScript")
    },
    {
      name: "SQL Fundamentals",
      image: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=900&q=80",
      questions: buildSeedQuestions("SQL")
    },
    {
      name: "Web Essentials",
      image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80",
      questions: buildSeedQuestions("Web")
    }
  ];

  const insertCourse = db.prepare("INSERT INTO courses (name, image) VALUES (?, ?)");
  const insertQuestion = db.prepare(
    "INSERT INTO questions (course_id, text, image, audio, video) VALUES (?, ?, ?, ?, ?)"
  );
  const insertAnswer = db.prepare(
    "INSERT INTO answers (question_id, text, is_correct) VALUES (?, ?, ?)"
  );

  const transaction = db.transaction(() => {
    courses.forEach((course) => {
      const courseResult = insertCourse.run(course.name, course.image);
      const courseId = courseResult.lastInsertRowid;

      course.questions.forEach((question) => {
        const questionResult = insertQuestion.run(
          courseId,
          question.text,
          question.image || null,
          question.audio || null,
          question.video || null
        );
        const questionId = questionResult.lastInsertRowid;

        question.answers.forEach((answer, index) => {
          insertAnswer.run(questionId, answer, index === 0 ? 1 : 0);
        });
      });
    });
  });

  transaction();
}

function buildSeedQuestions(topic) {
  const bank = {
    JavaScript: [
      ["Which keyword declares a block-scoped variable?", "let", "var", "consts", "scope"],
      ["Which array method creates a new array with transformed items?", "map", "push", "findIndex", "splice"],
      ["What does `===` compare?", "Value and type", "Only value", "Only type", "Memory address only"],
      ["Which function converts JSON text into an object?", "JSON.parse", "JSON.stringify", "Object.parse", "parse.object"],
      ["Which browser API sends HTTP requests in modern JS?", "fetch", "prompt", "alert", "history"],
      ["Which value is returned by a function without `return`?", "undefined", "null", "false", "0"],
      ["Which loop is designed to iterate over array values?", "for...of", "for...in", "while true", "loop"],
      ["Which method adds an item to the end of an array?", "push", "shift", "unshift", "slice"],
      ["Which statement stops a loop immediately?", "break", "continue", "return false", "stop"],
      ["What is the type of `NaN` in JavaScript?", "number", "string", "boolean", "object"],
      ["Which operator spreads array or object values?", "...", "??", "=>", "&&"],
      ["Which DOM method selects the first matching element?", "querySelector", "getElementsByTag", "queryAll", "findElement"]
    ],
    SQL: [
      ["Which SQL statement reads rows from a table?", "SELECT", "INSERT", "UPDATE", "CREATE"],
      ["Which clause filters rows after selection?", "WHERE", "ORDER BY", "GROUP BY", "LIMIT BY"],
      ["Which command removes a table entirely?", "DROP TABLE", "DELETE ROWS", "CLEAR TABLE", "TRUNCATE COLUMN"],
      ["Which keyword sorts query results?", "ORDER BY", "GROUP BY", "WHERE", "HAVING"],
      ["Which aggregate counts rows?", "COUNT", "SUM", "AVG", "TOTAL"],
      ["Which join returns only matching rows from both tables?", "INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL OUTER IN SQLite"],
      ["Which statement adds a new row?", "INSERT", "APPEND", "CREATE ROW", "ADD"],
      ["Which constraint enforces uniqueness?", "UNIQUE", "PRIMARY TEXT", "DEFAULT", "CHECK NULL"],
      ["Which clause groups rows for aggregates?", "GROUP BY", "ORDER BY", "HAVING", "LIMIT"],
      ["Which statement changes existing rows?", "UPDATE", "ALTER", "SET TABLE", "REPLACE COLUMN"],
      ["Which SQLite type commonly stores integer IDs?", "INTEGER", "TEXT", "REAL ONLY", "BOOL"],
      ["Which command removes rows but keeps the table?", "DELETE", "DROP", "REMOVE", "ERASE TABLE"]
    ],
    Web: [
      ["Which HTML tag creates a hyperlink?", "<a>", "<link>", "<p>", "<href>"],
      ["Which CSS property changes text color?", "color", "font-style", "background", "text-align"],
      ["Which HTTP method is commonly used for creating data?", "POST", "GET", "DELETE", "TRACE"],
      ["Which HTML tag embeds an image?", "<img>", "<picture-url>", "<media>", "<image>"],
      ["Which CSS layout mode is one-dimensional?", "flex", "grid", "table", "float"],
      ["Which status code means success?", "200", "404", "500", "301"],
      ["Which attribute provides alternative text for images?", "alt", "title", "src", "href"],
      ["Which tag is used for the largest heading by default?", "<h1>", "<header>", "<title>", "<head>"],
      ["Which JavaScript API stores small key/value data in browser persistently?", "localStorage", "sessionCookieOnly", "document.style", "window.cache"],
      ["Which CSS property adds space inside an element border?", "padding", "margin", "gap", "border-spacing"],
      ["Which HTML element plays audio content?", "<audio>", "<sound>", "<media>", "<track>"],
      ["Which Fetch API option usually carries JSON payload for POST?", "body", "headersOnly", "methodName", "query"]
    ]
  };

  return bank[topic].map((entry, index) => ({
    text: `${entry[0]} (${topic} Q${index + 1})`,
    image: index % 4 === 0 ? "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=80" : null,
    audio: null,
    video: index % 6 === 0 ? "https://www.w3schools.com/html/mov_bbb.mp4" : null,
    answers: entry.slice(1)
  }));
}

module.exports = {
  db,
  initializeDatabase
};
