# The Qualitative Coding Sandbox: Building It on an ATLAS.ti Replica

Source: `DT01_RD_05_03_Qualitative Coding Sandbox.pdf` (Reworked Storyboard v1.0, 17 Sept 2026).
The full text is extracted in `docs/storyboard_text.txt`.

## 1. The core idea

The storyboard asks for one persistent analysis workspace: a transcript pane, a codebook tray, a category and theme canvas, and an evidence map.
ATLAS.ti is already that workspace. So we don't invent a learning-tool UI. The learner works in a faithful ATLAS.ti replica, and each scene of the storyboard becomes a real ATLAS.ti workflow:

- quotations
- codes
- code groups
- intercoder agreement
- memos
- networks
- reports

The simulation-only parts sit on top of the replica as small overlays styled like ATLAS.ti:

- the supervisor messages
- the meters
- the gates
- the debrief

## 2. Overall shell (5 top-level sequences, fixed)

| # | Sequence | What the learner sees |
|---|---|---|
| (shell) | MIVA opener | Reuse the `Fix_the_Prompt_Opener.zip` package: logos, navy ground, chevrons. Retitle it **THE QUALITATIVE CODING SANDBOX**. |
| 1 | Title / case handoff | Name entry → handoff message from the lead researcher (exact line: *"Don’t force it into a clean story. Find out what's actually there."*) → ATLAS.ti welcome screen → open project **Student Wellbeing Access Study** |
| 2 | Gameplay 1: Build the Codebook | The ATLAS.ti main window: Documents P1–P6, Document viewer, Code Manager |
| 3 | Gameplay 2: Categories, themes, negative case | The same window: Code Groups, theme ranking, P7 arrives, Network editor |
| 4 | Gameplay 3: Defend the interpretation | Network editor (jigsaw), Memo editor (structured memo), Dr. Marsh's peer review |
| 5 | Ending / debrief | The report leaves ATLAS.ti → evidence-lineage debrief and competency profile |

There is no 6th scene and no dead end. The S1–S6.5 scenes from the source document are internal states inside sequences 2–4.

## 3. Storyboard mechanic → ATLAS.ti feature

| Storyboard | ATLAS.ti equivalent we replicate | Notes |
|---|---|---|
| **S1 Highlight & Segment** | Select text in the Document viewer → *Create Free Quotation*. Quotations show as brackets in the **margin area** with IDs (e.g. `2:3`). | ATLAS.ti lets you adjust quotation boundaries, which gives the keyboard start/end alternative. Span length and coherence decide S1 (strong / coarse / fragmented). |
| Fragmented consequence | The Code Manager loads 20+ near-duplicate suggested codes, plus a *"signal lost in noise"* banner | This is real ATLAS.ti behaviour: a bloated code list |
| Early field-note preview (hidden) | The field notes are **Memos** linked to P2/P5. Selecting a phrase in one shows the preview tooltip | No scoring |
| **S2 First-pass coding** | Drag a code from the **Code Manager** onto a quotation; the *Apply Codes* dialog; **In-Vivo Coding**; Rename; **Merge Codes** | Code colours = the storyboard's code-type colours (attitude #0EA5E9, behaviour #10B981, internal #A855F7, structural #F97316, meta #EC4899). The Code Manager's Groundedness and Density columns show reuse, which drives precise / overbroad / overfitted. |
| Merge Assistant (remedial) | ATLAS.ti's own *Merge Codes* dialog, with a preview of the merged label and quotations | Cyan remedial accent |
| **S3 Reconcile second coder** | **Intercoder Agreement** mode. A second user, "Coder 2", has codings on P2/P4/P5, shown in the margin in a different coder colour. | Each divergence opens a classification panel (6 options) plus an action choice |
| S3A Codebook audit (bonus) | **P8** is added to the Documents list (fuchsia tag); single-excerpt coding with a soft 90-second suggestion | Exact P8 text is in the storyboard. +10 confidence, "Field-Tested Codebook" badge. |
| S3C Coach check-in (remedial) | Message from the lead researcher → a side-by-side view of the P4 codings with both rationales | +5, capped at 74 |
| **S4 Category count + Sort into Bins** | **Code Groups**: a count stepper (2–6) in a *New Code Groups* dialog, then drag codes into groups in the Code Manager sidebar | Group colour = blended code-type tint; border = coherence tier |
| **S5 Theme ranking + P7 stress test** | P7 lands in Documents (lime tag) as a notification. Themes are higher-order codes / memos; the ranking is a reorder list. The stress test is a decision dialog: integrate / narrow / dismiss. | |
| Connect the Dots (optional) | The **Network editor**: drag the field-note memos into the theme network and link them | Raises evidenceTrailCompleteness only |
| **S6 Jigsaw Assembly** | The **Network editor**: Code Groups → Theme → Quotations, linked with ATLAS.ti relations (*is part of*, *is associated with*, *contradicts*, *supports*) | A completeness check shows missing links |
| Structured Memo | The **Memo editor**, pre-structured into 5 fields (theme claim, strongest evidence, reconciliation note, P7 treatment, final interpretation) | Review → Confirm → Submit |
| **S6.5 Dr. Marsh peer review** | Arrives as a comment / memo thread. A Response Builder is used for each challenge: evidence ref + posture (defend / qualify / revise) + rationale | Uses the exact challenge template |
| Analysis Audit Trail | Stored by the app (a project-log-style record) | Feeds the debrief and the facilitator view |
| HUD meters | A slim strip under the ribbon: Codebook Confidence, Category Coherence, Theme Integrity | 300–400 ms eased fill, semantic colours |
| Debrief | A "Project Report" view: lineage segment → code → category → theme → memo, plus the competency profile and reflection prompts | No leaderboard and no combined score |

## 4. Deterministic rules (the storyboard says "must reproduce")

- **S2:** precise → confidence 82; overbroad → 45 + overload flag; overfitted → 35 + cannot-generalise flag.
- **S3 gate:** 3/3 well → S3A/P8 (success +10, failure no penalty); 1–2/3 → S3B; 0/3 → S3C (+5, cap 74, clears the reliability flag).
- **S4:**
  - Count: 2 = over-generalisation warning, 5–6 = fragmentation warning. The warnings never block.
  - Coherence: mechanism + 3–4 categories → 85; outcome + 3–4 → 55; out-of-range + outcome → 35, with the flags stacked.
- **S5:** integrated → Theme Integrity 90; narrowed → 60; dismissed → 35. Field-note links raise evidenceTrailCompleteness only.
- **S6.5 unlock:** all three must be true: a majority of green nodes across S1–S5, the jigsaw fully linked, and the memo names both P4 and P7.
- **Fairness:** bonus and remedial content never changes the scoring ceiling.
- **State object:** as in storyboard §10.3, saved in the browser (the storyboard allows Supabase/Firebase; not needed for a learner simulation without accounts). There's a facilitator view with JSON export.

## 5. Technology (revised)

The storyboard specifies a **web-based** workspace. So instead of Electron, we build:

- **React + TypeScript + Vite**, with ATLAS.ti's desktop window drawn in the browser
- a state machine for the branch logic, keeping it separate from the UI so the rules are testable
- learner state saved in the browser (no accounts or backend), exportable from the facilitator view
- accessibility as specified: 44px targets, keyboard alternatives to every drag, and text labels alongside colour

## 6. Open issues

1. **Content that must not be made up (storyboard §10.6):**
   - P1–P7 transcripts
   - the two field notes
   - the second coder's P2/P4/P5 codes and rationale
   - the three candidate themes
   - the reference codebook / answer key
   - 3–4 alternative readings per excerpt

   We can build all the mechanics now, but the simulation can't be signed off until this content arrives.
2. **Which ATLAS.ti look to copy:** Windows desktop (ribbon), Mac desktop, or ATLAS.ti Web. They differ visibly.
3. **Faithfulness vs. the "premium, uncluttered" brief:** keep ATLAS.ti's real chrome, but use progressive disclosure. Only the panes relevant to the current phase are open, and the supervisor messages carry the instructions.
4. **Branding:** replicate the layout and workflow, but don't ship the ATLAS.ti logo or name as our own branding without permission.

## 7. Decisions (2026-10-08)

- **Edition:** replicate the **ATLAS.ti Windows desktop** look (ribbon, Project Explorer, margin area).
- **Content:** Claude drafts placeholder content for every item in storyboard §10.6. Each item is labelled `DRAFT` in the data files and in the UI, and the real content replaces it before sign-off.

## 8. Build status (2026-10-08)

All five top-level sequences are built: the opener, Sequence 1 (intro/handoff), Gameplays 1–3, and the ending/debrief. The facilitator view and replay checkpoints are built too. There is no backend or authentication; state is saved in the browser and exported from the facilitator view.

**Build-resolution defaults** (the source doesn't specify these):
- Mechanism grouping with an out-of-range category count → coherence 55.
- A misranked top theme plus "integrate" → narrowed (60).
- Codebook Confidence updates when a phase is committed, not live.

**Before sign-off:** replace all DRAFT content in `src/content/draftDataset.ts` and `src/content/answerKey.ts` (storyboard §10.6), then re-tune the S1, S2 and S4 thresholds in `src/sim/analysis.ts` against the real content.

## 9. Walkthrough video (2026-10-08)

Opener → narrated walkthrough player → name entry, as in the other Digitech builds (Drive practice, Sandbox Class, Fix the Prompt).

- **The video:** the pipeline in `video/` records the real build in headless Chrome. It then places the narration, composes the cursor, click rings and captions, shortens silent gaps, and exports to `public/walkthrough/`.
- **Answer-neutral:** it shows how to use the tool, not which analytical choices are right.
- **Narration:** the house voice is ElevenLabs "Ifeoma Odumodu - Nigerian Narrator". While the ElevenLabs API was unreachable, a macOS system voice was used as a placeholder; `video/narration/VOICE` records which voice is in the current build.

## 10. UI/UX simplification (2026-10-09)

Focus mode is on by default, with "Show classic layout" as a switch. It is a modern, minimal skin over the same layout and terms, built to cut a beginner's cognitive load. The details are in the README: one icon family (Phosphor), one right rail, a floating selection bar, one work surface at a time, and progressive disclosure in the task guidance.

## 11. Branding decision (2026-10-09)

The storyboard does not name ATLAS.ti or any other product. On the user's decision, the workspace is branded **MIVA Coding Workspace**:
- `PRODUCT_NAME` and a neutral app mark
- the switch is labelled "Show classic layout"
- walkthrough line 2 was trimmed from the existing Ifeoma narration so it no longer says the product name

The ATLAS.ti-modelled layout and terms (quotation, code, code group, network) stay; they are standard qualitative-analysis vocabulary.
