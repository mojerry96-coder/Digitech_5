# The Qualitative Coding Sandbox

**MIVA Coding Workspace**, a qualitative-analysis workspace (modelled on the ATLAS.ti Windows layout) that hosts the MIVA simulation *DT01_RD_05_03 – The Qualitative Coding Sandbox*.
The plan is in `docs/REPLICATION_PLAN.md`. The storyboard itself (*DT01_RD_05_03 Qualitative Coding Sandbox*) is an internal MIVA document and is not included in this public repository.

## Name and branding

The storyboard names no software. It asks for "a web-based document/analysis workspace". The workspace follows the layout and workflow of professional qualitative-analysis tools (it was modelled on ATLAS.ti), but it is branded as MIVA's own **MIVA Coding Workspace**, with its own app mark. No third-party name or logo appears in the simulation or the walkthrough. The name is set in one place: `src/config.ts`.

## Run

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Flow (Sequence 1)

1. **MIVA opener** (`src/screens/Opener.tsx`), ported from the *Fix the Prompt* opener package. It has the same 4.5 s timeline and can be skipped with Esc. With reduced motion, the finished frame appears straight away.
2. **Title / landing**: the learner enters their name.
3. **Workspace Welcome Screen**: the lead researcher's handoff appears in the Messages column, with the exact instruction line. The shared project is listed under Your Projects.
4. **Open Project** goes into the workspace. The handoff is filed as a memo, and the objective strip sits under the ribbon.

A returning learner goes straight back to where they were. `?skipintro` skips the opener. **File → Restart simulation** clears everything.

## Focus mode (default) and classic layout

The simulation opens in **focus mode**: the ATLAS.ti layout, colours and terms, with everything a beginner doesn't need taken away.

| Area | Focus mode | Classic layout (File → Show classic layout) |
|---|---|---|
| Commands | One slim toolbar whose buttons follow the open surface (Create quotation · Apply code · In vivo · Quick code · Comment · Delete) | Six-tab ribbon with contextual tabs; unused tools greyed out |
| Selecting text | A floating bar appears over the selection: Create quotation / Apply code / In vivo | Ribbon or right-click |
| Right side | One rail with **Task / Codes** tabs (Codes = compact Code Manager with drag-to-code, rename, type and merge) | Case panel plus a side-by-side Code Manager |
| Workspace | One surface at a time; the three most recent tabs stay open; the map gets full width | Two tab groups side by side |
| Explorer | Documents, Quotations, Codes, Memos; Code Groups and Networks once they exist | The full tree, including groups |
| Margin | Thin quotation brackets with readable horizontal labels and code pills | Rotated quotation bars |
| Meters | The meter that matters now, with earlier ones as small chips | All meters at full size |
| Guidance | One task line plus one main button; tips behind "How do I do this?"; earlier decisions folded into a "From earlier" chip | Everything expanded |

The switch is a per-browser preference.

**Icons.** There is one family, [Phosphor](https://phosphoricons.com), the house set from the Fix the Prompt opener.
- **Entity icons** (document, quotation, code, memo, network) use the duotone weight in a muted ATLAS.ti entity colour.
- **Command icons** are monochrome line icons; fill or bold appears only for active states.
- No emoji or text glyphs remain as icons.

**Type and surfaces.** Focus mode uses Manrope at 14px with Afacad for headings. It has 8–14px corner radii and soft borders, and transcripts stay in a serif face.

## The walkthrough

After the opener, **Begin** opens the walkthrough player and plays the narrated walkthrough with sound. Begin counts as the click browsers require before audio. If sound is still blocked, it plays muted and offers **Turn on sound**.

- **Captions** are available and off by default; the player's captions control turns them on.
- **At the end card,** the **Begin** drawn in the video becomes a real button that leads to name entry.
- **Skip walkthrough** or Esc closes it at any time.
- **Reopen it** from the ATLAS.ti **Help → Video Tutorials** ribbon button, or **▶ Watch walkthrough** in the Case panel.
- `?nowalk` makes Begin go straight to name entry.

The walkthrough records the **real build**, not a mock-up:
1. the Welcome Screen handoff
2. drag-selecting text and Create Free Quotation
3. Apply Codes and the Code Manager
4. the Codebook Confidence meter
5. Intercoder Agreement
6. the category count and Sort into Bins
7. theme ranking, P7 and the stress test
8. linking nodes on the interpretation map
9. the memo and Dr. Marsh's challenge
10. the debrief

It is deliberately **answer-neutral**: the video teaches how to use the tool, not which choices are right.
- **On camera,** the choices are neutral examples. The ranking is left as it is and the P7 options are only hovered.
- **Off-camera fast-forwards** have their feedback banners and callback flags cleared.
- **On the debrief,** the graded panels (submitted theme and meters, decision tiers, competency levels, challenge assessment) are hidden for the recording only. The learner's real debrief shows everything.

`public/walkthrough/` holds:

| File | What it is |
|---|---|
| `qcs-walkthrough-1080p.mp4` | 1920×1080, 30 fps, H.264/AAC, no captions showing |
| `qcs-walkthrough-1080p.webm` | the same in VP9/Opus |
| `qcs-walkthrough-1080p-open-captions.mp4` | captions burned in |
| `captions.srt`, `captions.vtt`, `captions.js` | caption files; the player reads `captions.js` |
| `transcript.md` | the transcript |

**Narration.** The house voice is ElevenLabs **"Ifeoma Odumodu - Nigerian Narrator"**, `eleven_multilingual_v2`, stability 0.6, similarity 0.8, as in the Drive, Sandbox Class and Fix the Prompt walkthroughs. `video/narration/VOICE` records which voice the current build uses.

### Rebuilding it

Needs Google Chrome, Node 22+, ffmpeg, and Python 3 with numpy and Pillow. Start the app first (`npm run dev`), because the recorder fast-forwards between sections through the dev-only store handles.

```bash
video/build.sh               # runs the whole chain below; keep the machine otherwise idle while it records
```

or step by step:

```bash
node video/record.mjs        # records the real build headlessly: video/shots/ + timeline.json
cd video
python3 schedule.py          # places each narration line against the recorded actions
python3 compose.py           # adds cursor, click rings, captions and the voice
python3 pace.py              # shortens silent gaps (narrated lines keep their speed)
python3 finish.py            # writes everything in ../public/walkthrough/
```

- **Lines:** they live in `video/lines.json`, shared by every step. To change one, edit it, regenerate its audio, and run the whole chain again. The recorder reads the narration lengths, so the actions wait for the voice.
- **Installing narration:** `python3 video/use_narration.py "<voice label>" s1.mp3 … s15.mp3` converts the files (in `lines.json` order) to `narration/s1.wav` … `s15.wav`. Then rerun from `record.mjs`.
- **Working files:** `video/shots/` and the intermediate MP4s in `video/` are working files. They are safe to delete.

## Gameplay 1: Build the Codebook

The **Case** panel docks on the right of the ATLAS.ti window and walks the learner through three phases:

| Phase | What the learner does | Rule (storyboard §10.2) |
|---|---|---|
| A · Segment | Create free quotations in P1–P6 (coding is locked). A keyboard start/end tool is the alternative to drag-selecting. | **S1** strong / coarse / fragmented, decided by how each quotation overlaps the DRAFT reference units. It seeds Phase B with clean, blended or 20+ micro-code suggestions. |
| B · Code | Code with the real ATLAS.ti tools: Apply Codes, drag-and-drop, in vivo, merge. | **S2** precise → 82 / overbroad → 45 + overload / overfitted → 35 + cannot-generalise. Weak S1 can still recover. |
| C · Reconcile | **Intercoder Agreement** tab: classify the P2, P4 and P5 divergences and choose an action. The chosen action changes the real codebook. | 3/3 → **S3A** (P8 bonus, soft 90 s timer, +10 and Field-Tested badge, no penalty on failure); 1–2 → **S3B**; 0/3 → **S3C** coach check-in (+5, capped at 74, clears the reliability flag). |

- **Meter:** Codebook Confidence sits in the strip under the ribbon. It animates over 350 ms and pulses on change.
- **Consequences:** immediate consequences appear as solid banners. Earlier flags come back as dashed "from earlier analysis" callbacks.
- **Hidden discovery:** highlighting text in a field note during Phases A or B shows the non-scoring preview tooltip.
- **Stored state:** branch state, flags, the codebook snapshot and an audit trail are kept in the session store (`src/sim/session.ts`).
- **Code locations:**
  - rules: `src/sim/analysis.ts` (tests: `npm test`)
  - phase transitions: `src/sim/gameplay1.ts`
  - DRAFT answer key and Coder 2 data: `src/content/answerKey.ts`
  - exact storyboard lines: `src/content/script.ts` (`EXACT`)

## Gameplay 2: Build and Stress-Test the Interpretation

| Step | What the learner does | Rule |
|---|---|---|
| Category count | Stepper 2–6 before sorting | 2 → over-generalisation warning; 5–6 → fragmentation warning. The warning stays in Sort into Bins and never blocks. |
| Sort into Bins | Drag codes, or use each chip's "move to" select, into named containers; on finish they become ATLAS.ti **Code Groups**. Container border shows live coherence; the tint shows the dominant code type. | **S4**: mechanism + 3–4 → 85; outcome + 3–4 → 55 (vague); out-of-range + outcome → 35 with stacked flags. Mechanism + out-of-range → 55 is my default (the source doesn't define it). |
| Rank themes | Reorder the 3 DRAFT candidate themes (drag or ▲▼). | Confirming the ranking brings in **P7** as the late negative case. |
| Stress test | A two-step decision about P7 against the top theme. | **S5**: integrated → 90; narrowed / over-corrected → 60; dismissed / inflated → 35. A misranked top theme can't reach "integrated". |
| Connect the Dots (optional) | Link the two field-note memos to the theme on the **Interpretation map** network. | Raises evidence-trail completeness only. |

## Gameplay 3: Defend the Interpretation

- **Jigsaw:** in the ATLAS.ti-style **Network editor**, link categories → theme, back each category with a quotation, and link a P7 quotation to the theme. Missing links stay listed in the Case panel. There's a list-based link form for keyboard users.
- **Structured memo:** five fields, then Review → Confirm → Submit. It is saved as an ATLAS.ti memo.
- **Peer-review gate:** majority green across S1–S5, the jigsaw fully linked, and the memo naming both P4 and P7.
- **Dr. Marsh's challenges:** three, built from the exact template using the memo evidence, the jigsaw evidence and the top-ranked theme, with readings from the DRAFT alternative-reading bank. Each is answered with the **Response Builder** (evidence + defend / qualify / revise + rationale). Responses never change the outcome tier.

## Sequence 5: Ending / debrief

- the submitted theme and the four meters
- the evidence lineage (segment → code → category → theme → memo)
- callbacks to earlier decisions (dashed, "from earlier analysis")
- "How your interpretation held up under challenge" (only if peer review unlocked)
- the 10-competency profile: only the 5 source-bound competencies get a level; the other 5 show the evidence on record
- two reflection prompts
- **replay** from Gameplay 1, 2 or 3 (checkpoints)

## Facilitator view

**File → Facilitator view**, or open `/?facilitator`. It shows the learner path, branch state, meters, flags, codebook, categories, theme, field-note use, memo, peer review, replay points and the audit trail, and can **export JSON**.

There are no accounts and no backend. Progress is saved in the learner's own browser (localStorage) so a reload resumes where they were, and the facilitator export carries the full learner record.

## Tests

`npm test` runs 23 unit tests over the deterministic rules. They cover every storyboard §10.7 acceptance check:
- recovery from a weak S1
- the fragmentation consequence
- the S3 bonus and recovery routes
- the S4 count warnings
- the three P7 states
- field notes not changing S5
- the S6.5 gate
- the challenge template binding
- scoring fairness

## What exists so far

- **The ATLAS.ti window:**
  - steel-blue title bar
  - ribbon with Home, Search & Code, Analyze, Import & Export, Tools and Help
  - contextual tabs for **Document** and **Code Manager**
  - File backstage
  - Project Explorer and comment pane
  - tabbed workspace with a side-by-side split
  - status bar
- **Document viewer:**
  - paragraph numbers
  - select text to make a quotation
  - margin area with quotation bars (overlapping quotations get separate lanes) and code labels
- **Coding:**
  - Apply Codes dialog (Ctrl+J): search, create, apply several codes, remove
  - Code in Vivo
  - Quick Coding (Ctrl+L)
  - Create Free Quotation
  - drag a code from the Code Manager or Explorer onto a selection or a quotation
  - unlink a code by right-clicking its label in the margin
- **Code Manager:**
  - Grounded column
  - code type (storyboard code-type colours)
  - rename
  - delete
  - **Merge Codes** with a preview
- **Managers and memos:** Document and Quotation Managers; field notes as memos.
- **Saving:** the project is saved in the learner's browser (localStorage). No accounts or backend.

## Content status

Everything in `src/content/draftDataset.ts` is **DRAFT placeholder content** (storyboard §10.6), except the P8 excerpt and the lead researcher's line. It is labelled DRAFT in the UI and must be replaced before sign-off.

## Product name

The title bar shows the value set in `src/config.ts`. Confirm whether the product name may be shown before release.
