const crypto = require("crypto");

const KEY_LENGTH = 64;
const HASH_ALGORITHM = "sha512";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH, {
    N: 16384,
    r: 8,
    p: 1
  }).toString("hex");

  return `${salt}:${hash}`;
}

function verifyPassword(password, storedValue) {
  if (!storedValue || !storedValue.includes(":")) {
    return false;
  }

  const [salt, originalHash] = storedValue.split(":");
  const candidateHash = crypto.scryptSync(password, salt, KEY_LENGTH, {
    N: 16384,
    r: 8,
    p: 1
  }).toString("hex");

  return crypto.timingSafeEqual(Buffer.from(candidateHash, "hex"), Buffer.from(originalHash, "hex"));
}

module.exports = {
  hashPassword,
  verifyPassword
};
