// Payment reconciliation.
//
// Reads payments.jsonl and works out how much money we actually collected.
// Run:  node reconcile.js

const fs = require("fs");

// Latest attempt per txn_id: txn_id -> { ts, status, amount }
const latest = new Map();

// Amounts may be numbers or strings with thousands separators ("4,804.15").
function parseAmount(value) {
  if (typeof value === "number") return value;
  return Number(String(value).replace(/,/g, "").trim());
}

const lines = fs.readFileSync("payments.jsonl", "utf8").split("\n").filter((l) => l.trim().length > 0);
for (const line of lines) {
  let event;
  try {
    event = JSON.parse(line);
  } catch (e) {
    continue; // unreadable line
  }
  if (event === null || typeof event !== "object" || Array.isArray(event)) continue;
  if (!event.txn_id) continue; // no txn_id

  // ISO-8601 UTC timestamps compare correctly as text; >= means a later line
  // wins if two attempts share the exact same timestamp.
  const prev = latest.get(event.txn_id);
  if (prev === undefined || event.ts >= prev.ts) {
    latest.set(event.txn_id, { ts: event.ts, status: event.status, amount: event.amount });
  }
}

let total = 0;
let count = 0;
for (const { status, amount } of latest.values()) {
  if (status === "success") {
    total += parseAmount(amount);
    count += 1;
  }
}

const expected = parseInt(fs.readFileSync("expected.txt", "utf8").trim(), 10);

if (count !== expected) {
  console.log(`Check failed: counted ${count} successful payments, expected ${expected}.`);
  console.log("Something in the data isn't being handled the way the README describes.");
} else {
  console.log(`Check passed: ${count} successful payments.`);
  console.log(`Your code: KOYA-${Math.round(total)}`);
}
