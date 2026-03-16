const { db } = require("../db/database");
const { hashPassword, verifyPassword } = require("../utils/password");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9]{10,15}$/;

function buildSessionUser(user) {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    phone: user.phone,
    role: user.role
  };
}

function register(req, res) {
  const { firstName, lastName, phone, email, password } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPhone = String(phone || "").trim();

  if (!firstName || !lastName || !phone || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }
  if (!EMAIL_RE.test(normalizedEmail)) {
    return res.status(400).json({ error: "Invalid email format" });
  }
  if (!PHONE_RE.test(normalizedPhone)) {
    return res.status(400).json({ error: "Invalid phone format" });
  }

  const existingPhone = db.prepare("SELECT id FROM users WHERE phone = ?").get(normalizedPhone);
  if (existingPhone) {
    return res.status(400).json({ error: "Phone number already exists" });
  }
  const existingEmail = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
  if (existingEmail) {
    return res.status(400).json({ error: "Email already exists" });
  }

  const passwordHash = hashPassword(password);
  const result = db
    .prepare(
      `INSERT INTO users (first_name, last_name, phone, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?, 'user')`
    )
    .run(firstName.trim(), lastName.trim(), normalizedPhone, normalizedEmail, passwordHash);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
  req.session.user = buildSessionUser(user);
  res.status(201).json({ user: req.session.user });
}

function login(req, res) {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ error: "Login and password are required" });
  }

  const normalized = login.trim().toLowerCase();
  const user = db
    .prepare("SELECT * FROM users WHERE email = ? OR phone = ? LIMIT 1")
    .get(normalized, login.trim());

  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  req.session.user = buildSessionUser(user);
  res.json({ user: req.session.user });
}

function logout(req, res) {
  req.session.destroy(() => {
    res.json({ success: true });
  });
}

function me(req, res) {
  res.json({ user: req.session.user || null });
}

module.exports = {
  login,
  logout,
  me,
  register
};
