<<<<<<< remote-updates
# Modo: oferta — Evaluación Completa A-G

Cuando el candidato pega una oferta (texto o URL), entregar SIEMPRE los 7 bloques (A-F evaluation + G legitimacy):
=======
# Mode: oferta — Complete A-F Evaluation

When the candidate pastes an offer (text or URL), ALWAYS deliver all 6 blocks:
>>>>>>> main

## Step 0 — Archetype Detection

Classify the offer into one of the 6 archetypes (see `_shared.md`). If hybrid, indicate the 2 closest. This determines:
- Which proof points to prioritize in block B
- How to rewrite the summary in block E
- Which STAR stories to prepare in block F

## Block A — Role Summary

Table with:
- Detected archetype
- Domain (platform/agentic/LLMOps/ML/enterprise)
- Function (build/consult/manage/deploy)
- Seniority
- Remote (full/hybrid/onsite)
- Team size (if mentioned)
- TL;DR in 1 sentence

## Block B — CV Match

Read `cv.md`. Create table with each JD requirement mapped to exact CV lines.

**Adapted to archetype:**
- If FDE → prioritize fast delivery and client-facing proof points
- If SA → prioritize systems design and integrations
- If PM → prioritize product discovery and metrics
- If LLMOps → prioritize evals, observability, pipelines
- If Agentic → prioritize multi-agent, HITL, orchestration
- If Transformation → prioritize change management, adoption, scaling

**Gaps** section with mitigation strategy for each one. For each gap:
1. Is it a hard blocker or a nice-to-have?
2. Can the candidate demonstrate adjacent experience?
3. Is there a portfolio project that covers this gap?
4. Concrete mitigation plan (phrase for cover letter, quick project, etc.)

## Block C — Level and Strategy

1. **Detected level** in the JD vs **candidate's natural level for that archetype**
2. **"Sell senior without lying" plan**: specific phrases adapted to the archetype, concrete achievements to highlight, how to position founder experience as an advantage
3. **"If I get downleveled" plan**: accept if comp is fair, negotiate 6-month review, clear promotion criteria

## Block D — Comp and Demand

Use WebSearch for:
- Current salaries for the role (Glassdoor, Levels.fyi, Blind)
- Company compensation reputation
- Role demand trend

Table with data and cited sources. If no data available, say so instead of making things up.

### Salary Estimation

Produce a single **Salary Estimate** (rounded to the nearest $5,000) representing the most likely base comp Dean would receive if hired. This is NOT just the midpoint of the listed range — use contextual signals:

| Signal | Effect on estimate within range |
|--------|-------------------------------|
| Rating >= 4.0 and primary archetype fit | Push toward upper quartile |
| Rating 3.5-3.9 or secondary archetype | Mid-range |
| Rating < 3.5 or significant gaps | Push toward lower quartile |
| Dean overqualified for the role | Mid-to-upper (leverage) |
| Dean underqualified / stretch role | Lower quartile |
| NYC/hybrid (Dean's preferred location) | No adjustment |
| Remote-only (no geo discount risk) | No adjustment |
| Very wide range (>$80K spread) | Weight toward realistic band for Dean's experience level |
| No listed salary | Estimate from market data (Levels.fyi, Glassdoor, similar roles at similar companies) |

Write the estimate into the Salary Estimate field in Airtable alongside Salary Low and Salary High.

## Block E — Customization Plan

| # | Section | Current state | Proposed change | Why |
|---|---------|---------------|-----------------|-----|
| 1 | Summary | ... | ... | ... |
| ... | ... | ... | ... | ... |

Top 5 CV changes + Top 5 LinkedIn changes to maximize match.

## Block F — Interview Plan

6-10 STAR+R stories mapped to JD requirements (STAR + **Reflection**):

| # | JD Requirement | STAR+R Story | S | T | A | R | Reflection |
|---|----------------|--------------|---|---|---|---|------------|

The **Reflection** column captures what was learned or what would be done differently. This signals seniority — junior candidates describe what happened, senior candidates extract lessons.

**Story Bank:** If `interview-prep/story-bank.md` exists, check if any of these stories are already there. If not, append new ones. Over time this builds a reusable bank of 5-10 master stories that can be adapted to any interview question.

**Selected and framed by archetype:**
- FDE → emphasize delivery speed and client-facing
- SA → emphasize architecture decisions
- PM → emphasize discovery and trade-offs
- LLMOps → emphasize metrics, evals, production hardening
- Agentic → emphasize orchestration, error handling, HITL
- Transformation → emphasize adoption, organizational change

Also include:
- 1 recommended case study (which project to present and how)
- Red-flag questions and how to answer them (e.g., "why did you sell your company?", "do you have direct reports?")

## Bloque G — Posting Legitimacy

Analyze the job posting for signals that indicate whether this is a real, active opening. This helps the user prioritize their effort on opportunities most likely to result in a hiring process.

**Ethical framing:** Present observations, not accusations. Every signal has legitimate explanations. The user decides how to weigh them.

### Signals to analyze (in order):

**1. Posting Freshness** (from Playwright snapshot, already captured in Paso 0):
- Date posted or "X days ago" -- extract from page
- Apply button state (active / closed / missing / redirects to generic page)
- If URL redirected to generic careers page, note it

**2. Description Quality** (from JD text):
- Does it name specific technologies, frameworks, tools?
- Does it mention team size, reporting structure, or org context?
- Are requirements realistic? (years of experience vs technology age)
- Is there a clear scope for the first 6-12 months?
- Is salary/compensation mentioned?
- What ratio of the JD is role-specific vs generic boilerplate?
- Any internal contradictions? (entry-level title + staff requirements, etc.)

**3. Company Hiring Signals** (2-3 WebSearch queries, combine with Block D research):
- Search: `"{company}" layoffs {year}` -- note date, scale, departments
- Search: `"{company}" hiring freeze {year}` -- note any announcements
- If layoffs found: are they in the same department as this role?

**4. Reposting Detection** (from scan-history.tsv):
- Check if company + similar role title appeared before with a different URL
- Note how many times and over what period

**5. Role Market Context** (qualitative, no additional queries):
- Is this a common role that typically fills in 4-6 weeks?
- Does the role make sense for this company's business?
- Is the seniority level one that legitimately takes longer to fill?

### Output format:

**Assessment:** One of three tiers:
- **High Confidence** -- Multiple signals suggest a real, active opening
- **Proceed with Caution** -- Mixed signals worth noting
- **Suspicious** -- Multiple ghost job indicators, investigate before investing time

**Signals table:** Each signal observed with its finding and weight (Positive / Neutral / Concerning).

**Context Notes:** Any caveats (niche role, government job, evergreen position, etc.) that explain potentially concerning signals.

### Edge case handling:
- **Government/academic postings:** Longer timelines are standard. Adjust thresholds (60-90 days is normal).
- **Evergreen/continuous hire postings:** If the JD explicitly says "ongoing" or "rolling," note it as context -- this is not a ghost job, it is a pipeline role.
- **Niche/executive roles:** Staff+, VP, Director, or highly specialized roles legitimately stay open for months. Adjust age thresholds accordingly.
- **Startup / pre-revenue:** Early-stage companies may have vague JDs because the role is genuinely undefined. Weight description vagueness less heavily.
- **No date available:** If posting age cannot be determined and no other signals are concerning, default to "Proceed with Caution" with a note that limited data was available. NEVER default to "Suspicious" without evidence.
- **Recruiter-sourced (no public posting):** Freshness signals unavailable. Note that active recruiter contact is itself a positive legitimacy signal.

---

## Post-evaluation

<<<<<<< remote-updates
**SIEMPRE** después de generar los bloques A-G:
=======
**ALWAYS** after generating blocks A-F:
>>>>>>> main

### 1. Save report .md

Save the complete evaluation in `reports/{###}-{company-slug}-{YYYY-MM-DD}.md`.

- `{###}` = next sequential number (3 digits, zero-padded)
- `{company-slug}` = company name in lowercase, no spaces (use hyphens)
- `{YYYY-MM-DD}` = current date

**Report format:**

```markdown
# Evaluation: {Company} — {Role}

**Date:** {YYYY-MM-DD}
**Archetype:** {detected}
**Score:** {X/5}
<<<<<<< remote-updates
**Legitimacy:** {High Confidence | Proceed with Caution | Suspicious}
**PDF:** {ruta o pendiente}
=======
**PDF:** {path or pending}
>>>>>>> main

---

## A) Role Summary
(complete block A content)

## B) CV Match
(complete block B content)

## C) Level and Strategy
(complete block C content)

## D) Comp and Demand
(complete block D content)

## E) Customization Plan
(complete block E content)

## F) Interview Plan
(complete block F content)

<<<<<<< remote-updates
## G) Posting Legitimacy
(contenido completo del bloque G)

## H) Draft Application Answers
(solo si score >= 4.5 — borradores de respuestas para el formulario de aplicación)
=======
## G) Draft Application Answers
(only if score >= 4.5 — draft answers for the application form)
>>>>>>> main

---

## Extracted Keywords
(list of 15-20 JD keywords for ATS optimization)
```

### 2. Register in tracker

**ALWAYS** register in `data/applications.md`:
- Next sequential number
- Current date
- Company
- Role
- Score: match average (1-5)
- Status: `Evaluated`
- PDF: ❌ (or ✅ if auto-pipeline generated PDF)
- Report: relative link to the report .md (e.g., `[001](reports/001-company-2026-01-01.md)`)

**Tracker format:**

```markdown
| # | Date | Company | Role | Score | Status | PDF | Report |
```

### 3. Sync to Airtable

If `modes/_profile.md` contains a `## Your Airtable Sync` section, run the sync gate:

#### 3a. Sync Gate Check

Read `score_threshold` from `_profile.md` Airtable config (default: 3.0).

| Condition | Action |
|---|---|
| Score >= threshold AND role NOT in Airtable | **Create** Role + Company (Step 3b) |
| Score >= threshold AND role already in Airtable | **Update** Role fields (Step 3c) |
| Score < threshold AND role already in Airtable | **Set Status to SKIP**, update Latest Date only |
| Score < threshold AND role NOT in Airtable | **Skip sync entirely** |

**Re-evaluation trigger:** If the user responds to an evaluation and the score changes, re-run this gate. A role bumped above threshold gets created/updated. A role dropped below threshold gets marked SKIP.

**Matching logic:** To find if a role exists in Airtable:
1. Use `list_records_for_table` with a filter on `Link` field matching the JD URL.
2. If no match, try filtering Companies table by name, then check linked Roles for matching title.

#### 3b. Create New Role

1. **Look up company** in Companies table by name using `search_records` or `list_records_for_table` with filter.
2. If not found, **create company** using `create_records_for_table` with just the Company name field.
3. **Create Roles record** using `create_records_for_table`:
   - Company → linked record ID from step 1/2
   - Role → role title from JD
   - Link → JD URL
   - Rating → score as decimal with one decimal place (e.g., 4.3, not rounded to integer)
   - Status → "Evaluated"
   - Notes → one-line evaluation summary
   - Salary Low → comp range low from Block D (USD, if available)
   - Salary High → comp range high from Block D (USD, if available)
   - Salary Estimate → contextual single-number estimate (see Salary Estimation below)
   - Remote? → "Remote", "Hybrid", or "On-site"
   - Location → primary office city/state (e.g., "New York, NY"). For remote roles, use company HQ or "Remote, US"
4. **Report:** "Synced to Airtable: {Company} — {Role} (new record)"

#### 3c. Update Existing Role

1. Use `update_records_for_table` on the matched record ID.
2. Update: Rating, Status (see rules below), Notes, Salary Low, Salary High, Salary Estimate, Remote?, Location.
3. Do NOT overwrite Link (URL should not change).
4. **Report:** "Synced to Airtable: {Company} — {Role} (updated existing)"

**Status write-back rules:**
- On new evaluation of a role with blank or "New Listing" status → set to "Evaluated"
- On new evaluation of a role with any other status (Applied, Interview, etc.) → preserve existing status
- On explicit status change in career-ops → map using `airtable_value` from `templates/states.yml`

#### 3d. Error Handling

If Airtable MCP is unavailable (tools not loaded, auth error, timeout):
- Log: "⚠️ Airtable sync skipped — MCP unavailable. Evaluation saved locally."
- Do NOT block the evaluation. Local report and tracker are the source of truth.

Use field IDs from `_profile.md` Airtable config for all API calls.
