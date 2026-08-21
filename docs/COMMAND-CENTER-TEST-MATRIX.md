# Command Center Test Matrix

Prompt-by-prompt QA checklist for the Erdavid Work OS AI chatbot — batch/sub-item creation, decompose disambiguation, LLM fallback, and multi-turn memory.

**How to use this:** paste each `Prompt` into the AI chat exactly as written, then compare the result against `Expected intent / entities` and `What to verify`. Tags: **read** = read-only query, **mutate** = produces a Mission Plan awaiting your approval, **edge case** = disambiguation check, **known limit** = current boundary, not a bug.

---

## 1. L0 Fast-Path — 0-Token Deterministic

These should resolve instantly via regex, without calling Gemini. If the reply is slow, the fast-path likely regressed.

### L0-1 · read
**Prompt:**
```
daftar project
```
- **Expected intent:** `list_projects`
- **Verify:** Card lists every workspace project with identifier + member count. Response should feel instant — no "thinking" delay.

### L0-2 · read
**Prompt:**
```
tampilkan tugasku
```
- **Expected intent:** `list_issues`, `userScope: "my_tasks"`
- **Verify:** Only issues assigned to the current user appear, across the active project scope.

### L0-3 · read
**Prompt:**
```
BSJ-12
```
- **Expected intent:** `get_issue`, `issueKey: "BSJ-12"`
- **Verify:** A bare issue key with no other text should still resolve to a detail card, not a chat reply. Use a real key that exists in your workspace.

### L0-4 · mutate
**Prompt:**
```
pindahkan task BSJ-12 ke Done
```
- **Expected intent:** `update_issue`, `state: "done"`
- **Verify:** Mission Plan asks for approval before touching Plane. After Approve & Execute, card shows "✓ Operation Verified" (read-after-write check).

---

## 2. Batch Task Creation

Numbered list with a colon splits into title + description per line.

### BAT-1 · mutate
**Prompt:**
```
buat task di project BSJ:
7. Recent Sales (mobile) : Table diganti jadi list card ringkas (nama produk, customer, tanggal di kiri; jumlah RM + badge status di kanan).
8. Spacing/gap : Jarak antar section dan antar card dipadatkan supaya gak terlalu jauh.
```
- **Expected intent:** `batch_create_issues` — 2 steps, each with title + description
- **Verify:** Open **Edit Plan** — both steps show the **description** field populated, not just the title. Title stops at the first colon.

### BAT-2 · mutate
**Prompt:**
```
buat 3 task di BSJ: fix login bug, update onboarding copy, refactor auth middleware
```
- **Expected intent:** `batch_create_issues` — 3 steps, title only
- **Verify:** Comma-separated (no numbering) still batches correctly into 3 separate steps, not one long title.

---

## 3. Sub-Item / Child Issue Creation

A mentioned issue key becomes the **parent**, not an update target — the newest addition this session.

### SUB-1 · mutate
**Prompt:**
```
tambahkan sub-task ke BSJ-12: fix validasi form
```
- **Expected intent:** `create_issue`, `parent: "BSJ-12"`
- **Verify:** Plan summary reads "...sebagai sub-item dari **BSJ-12**". After execute, the new issue appears as a **child of BSJ-12** in Plane, not a sibling in the backlog.

### SUB-2 · mutate
**Prompt:**
```
tambahkan sub-task ke BSJ-12, assign ke [nama member], deadline besok:
1. Fix validasi form
2. Tambah loading state
```
- **Expected intent:** `batch_create_issues`, `parent: "BSJ-12"`, assignee + dueDate set
- **Verify:** Edit Plan shows an assignee dropdown and a date field pre-filled for both rows — "besok" resolves to tomorrow's actual date, not the literal word.

### SUB-3 · edge case
**Prompt:**
```
tambahkan sub-task ke BSJ-12: fix validasi form
```
- **Expected intent:** `create_issue` (**NOT** `get_issue` or `update_issue`)
- **Verify:** This is the disambiguation this feature exists for: a bare issue key normally means "look this up" — here it must be read as a parent instead. If it opens BSJ-12's detail drawer, this regressed.

---

## 4. Decompose vs. Literal Sub-Item

"Figure it out yourself" vs. "here is my exact list" must route to two different engines.

### DEC-1 · mutate
**Prompt:**
```
pecah BSJ-12 jadi subtask
```
- **Expected intent:** `decompose` (AI invents 3–6 subtasks)
- **Verify:** Plan contains AI-generated subtask titles you never typed (Design & Specs / Backend / Frontend / Testing pattern), not a literal echo of your one-line prompt.

### DEC-2 · edge case
**Prompt:**
```
tambahkan sub-task ke BSJ-12: fix bug, tambah fitur baru
```
- **Expected intent:** `batch_create_issues` (literal 2 items, **NOT** AI decomposition)
- **Verify:** Contrast with DEC-1 — "sub-task" here is paired with an explicit list, so it must create exactly "fix bug" and "tambah fitur baru", not a reinterpreted AI plan.

---

## 5. LLM Function-Calling Fallback

Phrasing too messy or ambiguous for regex should still resolve correctly via Gemini.

### LLM-1 · read
**Prompt:**
```
eh tlg liatin issue yg urgent2 dong yg di bsj
```
- **Expected intent:** `list_issues`, `priority: "urgent"`, `projectKey: "BSJ"`
- **Verify:** Slang and typos ("tlg", "yg", "urgent2") don't derail intent detection. Response takes a beat longer than L0 — that's expected, it's routing through Gemini.

### LLM-2 · read
**Prompt:**
```
menurutmu mending kita kerjain yang mana dulu ya, bug login atau redesign dashboard?
```
- **Expected intent:** `chat` (`chatReply`, not a Plane action)
- **Verify:** No Mission Plan appears — this is advice, not a command. Reply should engage with the actual question, not deflect to a generic menu.

---

## 6. Multi-Turn Memory

Run both prompts **in the same session**, one after another. The second alone should fail without the first.

### MEM-1a · read (turn 1)
**Prompt:**
```
detail BSJ-12
```
- **Expected intent:** `get_issue`, `issueKey: "BSJ-12"`
- **Verify:** Just confirms BSJ-12 is now "in context" for the follow-up below.

### MEM-1b · mutate (turn 2)
**Prompt:**
```
ubah priority-nya jadi urgent
```
- **Expected intent:** `update_issue`, `issueKey: "BSJ-12"` (inferred!), `priority: "urgent"`
- **Verify:** The pronoun "-nya" resolves to BSJ-12 from turn 1 with **no issue key typed** in this message. This is the whole point of the memory upgrade — if it asks "which issue?", it regressed.

### MEM-2 · known limit
**Prompt:**
```
Turn 1: "buat task fix login bug di BSJ" (don't approve it)
Turn 2: "ubah priority-nya jadi urgent"
```
- **Expected intent:** likely unresolved — no real issue key exists yet
- **Verify:** Memory resolves references to **existing** issues, not ones still sitting unapproved in a plan. This is a real boundary of the feature, not a bug — worth confirming the assistant fails gracefully instead of hallucinating a key.

---

## 7. Vision & Conversation

The remaining two input modes: image attachment and plain conversation.

### VIS-1 · mutate
**Prompt:**
```
[Attach a bug screenshot] + "analisis screenshot ini dan buatkan tasknya"
```
- **Expected intent:** `create_issue`, title/description from image analysis
- **Verify:** Plan's title and description reflect what's actually in the screenshot (not a generic placeholder), with a sensible priority guess.

### CHAT-1 · read
**Prompt:**
```
halo
```
- **Expected intent:** `chat` (canned greeting + menu)
- **Verify:** Bare greeting resolves instantly (L0 path) with the intro/menu message — no LLM round-trip for something this simple.

---

*Generated as a QA companion for the AI Command Center chatbot.*
