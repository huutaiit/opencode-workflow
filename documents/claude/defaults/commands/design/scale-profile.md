# Scale Profile — Micro-Command v1.0

> Collect scale context before DD generation.
> Called by detail.md Step 0.4 when scale-profile.json not found.

---

## Purpose

Ask user 4 questions to classify project scale as LIGHT / MEDIUM / HEAVY.
Save result to `scale-profile.json` in context directory.

---

## Step 1: Ask Scale Questions

Display:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Scale Profile — Xác định quy mô dữ liệu
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q1: Records bị ảnh hưởng mỗi operation?
  1. < 1K records
  2. 1K - 100K records
  3. > 100K records

Q2: Số lần operation/ngày?
  1. < 50 lần
  2. 50 - 500 lần
  3. > 500 lần

Q3: Số user đồng thời trên cùng model?
  1. < 5 users
  2. 5 - 20 users
  3. > 20 users

Q4: Yêu cầu response time?
  1. > 30 giây (ok chờ được)
  2. 5 - 30 giây
  3. < 5 giây (cần nhanh)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**WAIT FOR USER RESPONSE.** User trả lời 4 số (ví dụ: "3 2 1 3" hoặc từng câu).

---

## Step 2: Map Answers to Profile

```pseudo
answer_map = {
  "1": { records: 500, ops: 25, users: 3, sla: 60 },
  "2": { records: 50000, ops: 250, users: 12, sla: 15 },
  "3": { records: 200000, ops: 700, users: 30, sla: 3 }
}

profile = {
  recordsPerOperation: answer_map[q1].records,
  operationsPerDay: answer_map[q2].ops,
  concurrentUsers: answer_map[q3].users,
  maxResponseTimeSeconds: answer_map[q4].sla
}
```

---

## Step 3: Classify and Save

```bash
# Save profile to context directory
CONTEXT_DIR=$(node -e "const sm=require('./core/state/state-manager.js');console.log(sm.findActiveContext()||'')")
echo '$PROFILE_JSON' > "$CONTEXT_DIR/scale-profile.json"

# Classify
node core/cli/actions/scale-classify.js --input "$CONTEXT_DIR/scale-profile.json"
```

Read classification result. Export `SCALE_CLASSIFICATION`.

---

## Step 4: Display Result

```
Scale Profile:
  Records/operation: [value] → [LIGHT/MEDIUM/HEAVY]
  Operations/day:    [value] → [LIGHT/MEDIUM/HEAVY]
  Concurrent users:  [value] → [LIGHT/MEDIUM/HEAVY]
  Response time:     [value]s → [LIGHT/MEDIUM/HEAVY]

  Overall: [CLASSIFICATION]
```

If HEAVY:
```
⚠️ HEAVY classification detected.
Performance specialist (428.x) và ORM bypass specialist (506.x) sẽ được load tự động.
DD pseudo-code sẽ reference batch patterns và bypass patterns.
```

---

**RETURN** to detail.md with SCALE_CLASSIFICATION exported.

---
*Scale Profile v1.0 — EPS Framework v10.0*
