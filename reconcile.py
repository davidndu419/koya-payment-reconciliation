#!/usr/bin/env python3
"""Payment reconciliation.

Reads payments.jsonl and works out how much money we actually collected.
Run:  python3 reconcile.py
"""
import json

# Latest attempt per txn_id: txn_id -> (ts, status, amount)
latest = {}


def parse_amount(value):
    """Amounts may be numbers or strings with thousands separators ("4,804.15")."""
    if isinstance(value, (int, float)):
        return float(value)
    return float(str(value).replace(",", "").strip())


with open("payments.jsonl", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            event = json.loads(line)
        except ValueError:
            continue  # unreadable line
        if not isinstance(event, dict):
            continue
        txn_id = event.get("txn_id")
        if not txn_id:
            continue  # no txn_id
        ts = event.get("ts")
        prev = latest.get(txn_id)
        if prev is None or ts >= prev[0]:
            latest[txn_id] = (ts, event.get("status"), event.get("amount"))

total = 0.0
count = 0
for ts, status, amount in latest.values():
    if status == "success":
        total += parse_amount(amount)
        count += 1

with open("expected.txt") as f:
    expected = int(f.read().strip())

if count != expected:
    print(f"Check failed: counted {count} successful payments, expected {expected}.")
    print("Something in the data isn't being handled the way the README describes.")
else:
    print(f"Check passed: {count} successful payments.")
    print(f"Your code: KOYA-{round(total)}")
