/**
 * DRAFT ANSWER KEY — placeholder only (storyboard §10.6).
 *
 * "The expected/reference codebook or equivalent answer-key rules needed to
 * classify S1/S2 performance consistently" and "the second coder's exact
 * P2/P4/P5 codes and rationale" were not supplied. Everything here is drafted
 * against the DRAFT transcripts so the mechanics run end to end, and must be
 * replaced (together with the transcripts) before sign-off.
 */
import type { ParticipantId } from './draftDataset'
import type { CodeType } from '../store/project'

export const ANSWER_KEY_DRAFT = true

/** Underlying mechanisms a meaningful unit expresses. */
export type Mechanism =
  | 'ENDORSE'
  | 'CRITIQUE'
  | 'ENCOUNTER'
  | 'NONENGAGE'
  | 'SELFRELIANCE'
  | 'ILLEGIT'
  | 'STIGMA'
  | 'DISTRESS'
  | 'ACCESS'
  | 'PUBLICPRIVATE'

export const MECHANISMS: Record<Mechanism, { label: string; family: CodeType }> = {
  ENDORSE: { label: 'Endorses the service', family: 'attitude' },
  CRITIQUE: { label: 'Critical of the service', family: 'attitude' },
  ENCOUNTER: { label: 'Positive encounter with a practitioner', family: 'attitude' },
  NONENGAGE: { label: 'Not attending / not returning', family: 'behaviour' },
  SELFRELIANCE: { label: 'Self-reliance / keeping it private', family: 'internal' },
  ILLEGIT: { label: 'Perceived illegitimacy of need', family: 'internal' },
  STIGMA: { label: 'Fear of being seen / judged', family: 'internal' },
  DISTRESS: { label: 'Reported distress', family: 'internal' },
  ACCESS: { label: 'Access barrier (time, wait, place)', family: 'structural' },
  PUBLICPRIVATE: { label: 'Public account vs private experience', family: 'meta' },
}

/** Mechanisms close enough that one code may hold both without being overbroad. */
export const COMPATIBLE: [Mechanism, Mechanism][] = [['ENDORSE', 'ENCOUNTER']]

export interface ReferenceUnit {
  id: string
  participant: ParticipantId
  /** Exact substring of the transcript. */
  text: string
  mechanism: Mechanism
  /** A second defensible reading (P5 is deliberately ambiguous). */
  alt?: Mechanism
}

const u = (participant: ParticipantId, n: number, mechanism: Mechanism, text: string, alt?: Mechanism): ReferenceUnit => ({
  id: `${participant}.seg${n}`,
  participant,
  text,
  mechanism,
  alt,
})

export const REFERENCE_UNITS: ReferenceUnit[] = [
  u('P1', 1, 'ENDORSE', "Honestly, I think it's a good thing that it exists. When we had the induction talk I remember thinking, fair play, that's properly set up. The website is clear and they do drop-ins."),
  u('P1', 2, 'NONENGAGE', "But I've not been."),
  u('P1', 3, 'SELFRELIANCE', "I'm not really someone who talks about stuff. If something's getting on top of me I just go to the gym or put my headphones in and get on with the problem set. That's how I was brought up, you sort it yourself."),
  u('P1', 4, 'SELFRELIANCE', "It's not something that comes up. My mates don't ask and I don't bring it up."),
  u('P1', 5, 'ILLEGIT', "I suppose if I was really bad I'd go, but I've never been that bad."),

  u('P2', 1, 'ENDORSE', "Oh, it's brilliant. I always tell people it's good."),
  u('P2', 2, 'ENDORSE', "When my flatmate was having a hard time in first term I literally walked her to the door. I'd recommend it to anyone."),
  u('P2', 3, 'NONENGAGE', "No. No, I haven't actually been."),
  u('P2', 4, 'DISTRESS', "I've had a rough few months, to be fair,"),
  u('P2', 5, 'ILLEGIT', 'but it feels a bit dramatic to book something.'),
  u('P2', 6, 'STIGMA', "Like, people would ask why I was going, and I'd have to have an answer."),
  u('P2', 7, 'PUBLICPRIVATE', "It's easier to be the one who tells everyone else to go. Then nobody worries about you."),

  u('P3', 1, 'CRITIQUE', "I'll be honest, I'm pretty critical of it."),
  u('P3', 2, 'ACCESS', 'I filled in the self-referral form in October and got an email saying the wait for an initial assessment was six weeks. Six weeks. By the time they got back to me it was exam season.'),
  u('P3', 3, 'ACCESS', "And the appointments are all nine to five on weekdays, which is exactly when I'm in seminars or at my job. There's no evening option at all."),
  u('P3', 4, 'NONENGAGE', 'I went once.'),
  u('P3', 5, 'ENCOUNTER', 'The person was fine, genuinely.'),
  u('P3', 6, 'ACCESS', 'But they said the next slot was another month away, so I just stopped chasing it.'),
  u('P3', 7, 'ACCESS', "The system isn't built for people who work."),

  u('P4', 1, 'NONENGAGE', 'I thought about it, during the placement especially.'),
  u('P4', 2, 'DISTRESS', "I wasn't sleeping and I was crying in the car before shifts."),
  u('P4', 3, 'ILLEGIT', "But then I'd think, I'm on a ward with people who are actually ill. What have I got to complain about?"),
  u('P4', 4, 'ILLEGIT', "The service is for people with real problems. Proper mental health stuff. If I took an appointment I'd feel like I was taking it off someone who needed it more than me."),
  u('P4', 5, 'ILLEGIT', "I just told myself everyone finds first placement hard. It's normal, so it doesn't count."),
  u('P4', 6, 'ILLEGIT', "I'm fine now. Mostly."),

  u('P5', 1, 'NONENGAGE', 'I booked once and then cancelled the morning of.'),
  u('P5', 2, 'STIGMA', "The service is on the first floor of the Students' Union, right above the café where everyone from my course sits. You'd have to walk past all of them.", 'ACCESS'),
  u('P5', 3, 'STIGMA', "Law is very competitive. There's this idea that you need to look like you can handle pressure, because that's the job. If people on my course thought I couldn't cope, I think it would follow me."),
  u('P5', 4, 'STIGMA', "Both, probably. Even if it was somewhere hidden, I don't know.", 'ACCESS'),
  u('P5', 5, 'ILLEGIT', "I'm not sure I'd think I was bad enough to go. I'm just stressed, like everyone."),

  u('P6', 1, 'NONENGAGE', 'Once, in second year. After a breakup.'),
  u('P6', 2, 'ENCOUNTER', 'The counsellor was really kind and listened properly.'),
  u('P6', 3, 'NONENGAGE', "I didn't go back, though."),
  u('P6', 4, 'ILLEGIT', "I came out of it feeling like I'd taken up an hour of her time talking about something pretty ordinary. People go through worse."),
  u('P6', 5, 'SELFRELIANCE', "No. Nobody knew. It wasn't a secret exactly, it just never came up, and I sorted things out on my own in the end."),

  // P8 (bonus) — exact source text, one unit.
  u('P8', 1, 'ILLEGIT', "I'd go if I needed to. I don’t need to. I mean - I probably do, a bit. It's fine. I’m fine."),
]

/* ------------------------------------------------------------------ */
/* Scene 2 starting environment: code suggestions inherited from S1.   */
/* ------------------------------------------------------------------ */

export interface Suggestion {
  name: string
  type?: CodeType
}

/** S1-Strong: suggestions map reasonably well to distinct ideas. */
export const SUGGESTIONS_STRONG: Suggestion[] = [
  { name: 'speaks positively about the service', type: 'attitude' },
  { name: 'has not used / did not return', type: 'behaviour' },
  { name: 'handles it alone', type: 'internal' },
  { name: 'worried about being seen', type: 'internal' },
  { name: 'waiting times and opening hours', type: 'structural' },
  { name: 'struggling', type: 'internal' },
]

/** S1-Coarse: blended suggestions that fold attitude and behaviour together. */
export const SUGGESTIONS_COARSE: Suggestion[] = [
  { name: 'positive about service but not using it' },
  { name: 'struggling but managing' },
  { name: 'problems with the service' },
  { name: 'reasons for not going' },
]

/** S1-Fragmented: 20+ near-duplicate micro-codes ("signal lost in noise"). */
export const SUGGESTIONS_FRAGMENTED: Suggestion[] = [
  'brilliant', 'good thing', 'good', 'recommend', 'recommend it to anyone', 'properly set up', 'drop-ins',
  'not been', "haven't been", 'cancelled', "didn't go back", 'went once', 'gym', 'headphones', 'problem set',
  'brought up', 'dramatic', 'people would ask', 'flatmate', 'six weeks', 'nine to five', 'evening',
  'first floor', 'café', 'competitive', 'breakup', 'kind', 'ordinary', 'worse', 'fine',
].map((name) => ({ name }))

/* ------------------------------------------------------------------ */
/* Scene 3: second coder's divergences (P2, P4, P5).                    */
/* ------------------------------------------------------------------ */

export type DivergenceClass = 'poor' | 'variation' | 'overlap' | 'broad' | 'narrow' | 'revise'

export const DIVERGENCE_CLASSES: { id: DivergenceClass; label: string }[] = [
  { id: 'poor', label: 'Poor coding' },
  { id: 'variation', label: 'Legitimate interpretive variation' },
  { id: 'overlap', label: 'Overlapping codes' },
  { id: 'broad', label: 'Too broad' },
  { id: 'narrow', label: 'Too narrow' },
  { id: 'revise', label: 'Codebook needs revision' },
]

export type ActionKind = 'keepMine' | 'adoptTheirs' | 'precise' | 'other'

export interface DivergenceAction {
  id: string
  label: string
  kind: ActionKind
}

export interface Divergence {
  participant: 'P2' | 'P4' | 'P5'
  /** Reference units the divergence sits on. */
  unitIds: string[]
  coder2Code: { name: string; type: CodeType }
  coder2Rationale: string
  /** Classifications that count as well handled. */
  correct: DivergenceClass[]
  /** Classifications that are defensible but incomplete (partial credit). */
  defensible: DivergenceClass[]
  actions: DivergenceAction[]
  /** The precision-improving action. */
  preciseActionId: string
  /** Name of the code the precise action produces or applies. */
  preciseCodeName: string
  preciseCodeType: CodeType
}

export const DIVERGENCES: Divergence[] = [
  {
    participant: 'P2',
    unitIds: ['P2.seg1', 'P2.seg2'],
    coder2Code: { name: 'positive experience of service', type: 'attitude' },
    coder2Rationale:
      'P2 describes the service as brilliant and recommends it to anyone, so I coded it as a positive experience, the same as P6’s kind counsellor.',
    correct: ['broad'],
    defensible: ['poor', 'revise'],
    actions: [
      { id: 'keep', label: 'Keep my code; discard Coder 2’s', kind: 'keepMine' },
      { id: 'adopt', label: 'Adopt “positive experience of service” in place of mine', kind: 'adoptTheirs' },
      {
        id: 'split',
        label: 'Separate endorsing the service from experiencing it: code P2 as “endorses without using”',
        kind: 'precise',
      },
      { id: 'both', label: 'Apply both codes as they stand', kind: 'other' },
    ],
    preciseActionId: 'split',
    preciseCodeName: 'endorses without using',
    preciseCodeType: 'attitude',
  },
  {
    participant: 'P4',
    unitIds: ['P4.seg3', 'P4.seg4', 'P4.seg5'],
    coder2Code: { name: 'perceived illegitimacy of need', type: 'internal' },
    coder2Rationale:
      'Across these lines P4 keeps deciding their distress doesn’t count — others are “actually ill”, the service is for “real problems”. I read that as one mechanism: not feeling entitled to support.',
    correct: ['overlap', 'revise'],
    defensible: ['variation'],
    actions: [
      { id: 'keep', label: 'Keep my codes; discard Coder 2’s', kind: 'keepMine' },
      { id: 'adopt', label: 'Replace my codes with Coder 2’s on P4 only', kind: 'adoptTheirs' },
      {
        id: 'merge',
        label: 'Merge my overlapping codes into “perceived illegitimacy of need” across the codebook',
        kind: 'precise',
      },
      { id: 'both', label: 'Keep both sets side by side', kind: 'other' },
    ],
    preciseActionId: 'merge',
    preciseCodeName: 'perceived illegitimacy of need',
    preciseCodeType: 'internal',
  },
  {
    participant: 'P5',
    unitIds: ['P5.seg2'],
    coder2Code: { name: 'access barrier: location', type: 'structural' },
    coder2Rationale:
      'The service sits above a busy café in the Union, so P5 would have to walk past their course-mates. I coded the location as an access barrier.',
    correct: ['variation'],
    defensible: ['overlap'],
    actions: [
      { id: 'keep', label: 'Keep my code; discard Coder 2’s', kind: 'keepMine' },
      { id: 'adopt', label: 'Adopt Coder 2’s code in place of mine', kind: 'adoptTheirs' },
      {
        id: 'double',
        label: 'Apply both readings and record the ambiguity in a code comment',
        kind: 'precise',
      },
      { id: 'blend', label: 'Create a new combined code “stigmatised location”', kind: 'other' },
    ],
    preciseActionId: 'double',
    preciseCodeName: 'access barrier: location',
    preciseCodeType: 'structural',
  },
]

/* ------------------------------------------------------------------ */
/* Scene 3C coach check-in (scaffolded P4 replay).                      */
/* ------------------------------------------------------------------ */

export const COACH_QUESTION = 'What does Coder 2’s code capture that yours doesn’t?'

export const COACH_OPTIONS = [
  {
    id: 'mechanism',
    label: 'A mechanism: P4 doubts their need is legitimate enough to deserve support.',
    correct: true,
    hint: '',
  },
  {
    id: 'same',
    label: 'Nothing — the two codes say the same thing in different words.',
    correct: false,
    hint: 'Look at the lines Coder 2 grouped: “actually ill”, “real problems”, “it doesn’t count”. What do they share that a descriptive label misses?',
  },
  {
    id: 'academic',
    label: 'It is just a more academic way of naming the topic.',
    correct: false,
    hint: 'Try applying each code to P6 (“taking up an hour of her time”). Which one travels to another participant?',
  },
]

/* ================================================================== */
/* GAMEPLAY 2 — categories, candidate themes, P7 negative case (DRAFT) */
/* ================================================================== */

/** Reference categories: codes grouped by shared underlying mechanism. */
export type RefCategory = 'SEEN' | 'ENTITLED' | 'SERVICE' | 'ACCESS'

export const REF_CATEGORIES: Record<RefCategory, { label: string; mechanisms: Mechanism[] }> = {
  SEEN: { label: 'Managing how I’m seen', mechanisms: ['STIGMA', 'PUBLICPRIVATE', 'SELFRELIANCE'] },
  ENTITLED: { label: 'Not entitled to need it', mechanisms: ['ILLEGIT', 'DISTRESS'] },
  SERVICE: { label: 'Relationship with the service', mechanisms: ['ENDORSE', 'ENCOUNTER', 'CRITIQUE', 'NONENGAGE'] },
  ACCESS: { label: 'Practical access', mechanisms: ['ACCESS'] },
}

/** Reference categories close enough to share one mechanism-based container when fewer categories are chosen. */
export const ALLOWED_CATEGORY_PAIRS: [RefCategory, RefCategory][] = [
  ['SEEN', 'ENTITLED'],
  ['SERVICE', 'ACCESS'],
]

export const refCategoryOf = (m: Mechanism): RefCategory =>
  (Object.keys(REF_CATEGORIES) as RefCategory[]).find((k) => REF_CATEGORIES[k].mechanisms.includes(m))!

export interface CandidateTheme {
  id: string
  label: string
  statement: string
  /** Noun phrase used in the peer-challenge template's {theme_claim} slot. */
  claimPhrase: string
  correct: boolean
}

export const CANDIDATE_THEMES: CandidateTheme[] = [
  {
    id: 'T-ENTITLE',
    label: 'Support is for other people',
    statement:
      'Students endorse the service in principle but judge their own distress as not serious enough to count — so support becomes something for other people.',
    claimPhrase: 'a belief that support is for other people',
    correct: true,
  },
  {
    id: 'T-SATISFIED',
    label: 'A trusted service students don’t need',
    statement: 'Students trust and recommend the service; low use simply reflects that most of them don’t need it.',
    claimPhrase: 'satisfaction with a service students don’t need',
    correct: false,
  },
  {
    id: 'T-STIGMA',
    label: 'Fear of being seen',
    statement: 'Students avoid the service because being seen to use it would cost them socially.',
    claimPhrase: 'fear of being seen using the service',
    correct: false,
  },
]

/** Integrated revision of the correct theme after P7. */
export const INTEGRATED_STATEMENT =
  'Students endorse the service in principle but judge their own distress as not serious enough to count — so support becomes something for other people. Entitlement shapes whether students start; fit shapes whether they stay: P7 felt fully entitled and still disengaged when the support didn’t fit.'

export const NARROWED_STATEMENT =
  'Students who publicly recommend the service privately doubt that their own need is real.'

export type P7Outcome = 'integrated' | 'narrowed' | 'dismissed'

/** Conditional Simulator for the P7 stress test (two-step decision tree). */
export const P7_STEP1 = {
  prompt: 'Read against your top theme, what is P7?',
  options: [
    { id: 'fits', label: 'Further support for the theme — P7 used the service, which shows students value it.', next: 'dismissed' as const },
    { id: 'outlier', label: 'An outlier — an international student whose circumstances the rest of the sample doesn’t share.', next: 'dismissed' as const },
    { id: 'boundary', label: 'A negative case — P7 felt fully entitled to support and still stopped going.', next: 'step2' as const },
  ],
}

export const P7_STEP2 = {
  prompt: 'How do you revise the theme?',
  options: [
    {
      id: 'integrate',
      label: 'Keep the theme’s core and mark its edge: state what P7 shows that the theme doesn’t explain, and where the theme stops.',
      outcome: 'integrated' as P7Outcome,
    },
    {
      id: 'narrow',
      label: 'Restrict the theme to students who publicly endorse the service while privately doubting their need.',
      outcome: 'narrowed' as P7Outcome,
    },
    {
      id: 'replace',
      label: 'Drop the theme’s core; the real issue is that the service doesn’t fit students.',
      outcome: 'narrowed' as P7Outcome,
    },
  ],
}

/* ================================================================== */
/* GAMEPLAY 3 — peer-challenge alternative-reading bank (DRAFT)        */
/* ================================================================== */

/** 3–4 plausible alternative readings per excerpt P1–P7 (storyboard §10.2). */
export const ALTERNATIVE_READINGS: Record<'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7', string[]> = {
  P1: [
    'plain self-sufficiency rather than doubt about entitlement',
    'a norm about not talking that has nothing to do with the service',
    'a student who genuinely hasn’t needed support yet',
  ],
  P2: [
    'politeness towards an interviewer asking about the service',
    'genuine care for her flatmate rather than anything about herself',
    'social desirability in an interview about wellbeing',
    'a passing low mood rather than an unmet need',
  ],
  P3: [
    'a purely practical access problem',
    'general frustration with university services',
    'a timing problem specific to exam season',
  ],
  P4: [
    'placement stress that resolved on its own',
    'professional socialisation into nursing’s “others come first” ethic',
    'an accurate judgement that their need was lower than patients’',
  ],
  P5: [
    'a location problem that moving the service would solve',
    'a competitive course culture rather than anything about entitlement',
    'ordinary exam stress described in ordinary terms',
  ],
  P6: [
    'a normal single-session outcome',
    'embarrassment about the breakup itself',
    'satisfaction — one session was simply enough',
  ],
  P7: [
    'a cultural mismatch rather than a design flaw in the service',
    'an international-student issue outside the study’s scope',
    'a need for specialist rather than general support',
  ],
}
