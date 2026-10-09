/**
 * On-screen copy for Gameplay 1.
 * EXACT = word-for-word from the storyboard source; keep unchanged.
 * Everything else is authored UI/feedback copy in the storyboard's voice
 * (research supervision, not quiz results).
 */

export const EXACT = {
  fragmentedFeedback:
    'You\'ve captured almost every word as its own unit. That\'s not more rigorous — it\'s just noisier. A segment should carry one complete idea. If you can’t summarise what a segment is about in a phrase, it\'s probably cut too fine.',
  fieldNotePreview: 'Interesting — you’re already reading between the lines. Hold that instinct.',
  s3aMessage: 'Your reconciliation is sharp enough that I’m going to throw you something extra — a transcript we almost didn’t include.',
  p8Feedback: 'A codebook earns its keep the moment it survives contact with a new, messier case. That\'s what just happened.',
  s3cMessage: 'You\'ve resolved all three of these by just picking whichever code you already had. That\'s worth pausing on before we move forward.',
  s3cFeedback:
    'This isn’t about redoing your original judgement — it\'s about noticing when a disagreement is telling you something your codebook doesn’t have a word for yet. That noticing is the actual skill.',
  signalLost: 'Signal lost in noise',
}

export const COPY = {
  phaseA: {
    title: 'Highlight & Segment',
    task: 'Mark the meaningful units in P1–P6. Don’t code yet.',
    how: 'Select text, then Create Free Quotation (ribbon or right-click).',
    finish: 'Finish segmenting',
    needAll: 'Each transcript needs at least one segment.',
  },
  s1: {
    strong: {
      title: 'Distinct units',
      text: 'Your segments separate what students say they think from what they actually do. The codebook preview forms cleanly around distinct ideas.',
    },
    coarse: {
      title: 'Blended units',
      text: 'Several segments hold more than one idea — an attitude and a behaviour in the same unit. Those blends travel into coding: watch for segments one code can’t represent.',
    },
  },
  phaseB: {
    title: 'First-Pass Coding',
    task: 'Code all six excerpts. Reuse codes where the same idea recurs.',
    how: 'Apply Codes (Ctrl+J), drag from the Code Manager, rename or merge as you go.',
    finish: 'Finish first-pass coding',
    needAll: 'Each transcript needs at least one coded segment.',
    suggestionsNote: 'Suggested codes come from the codebook preview your segmentation produced. Use, rename, merge or ignore them.',
  },
  s2: {
    precise: {
      title: 'Coherent codebook',
      text: 'Your codes name mechanisms and travel across participants. Someone else could pick this codebook up and apply it.',
    },
    overbroad: {
      title: 'Code overload',
      text: 'One code is carrying structurally different experiences. If a code can mean a waiting list and feeling undeserving at once, it can’t tell them apart.',
    },
    overfitted: {
      title: 'Codebook cannot generalise',
      text: 'Almost every code fits exactly one excerpt. A codebook that never repeats can’t show you a pattern across participants.',
    },
  },
  phaseC: {
    title: 'Reconcile with Coder 2',
    task: 'Coder 2 read P2, P4 and P5 differently. Classify each divergence and choose what to do.',
    submit: 'Submit reconciliation',
  },
  s3b: {
    title: 'Standard continuation',
    text: 'Your reconciliation moved the codebook forward. It carries into category building as it stands.',
  },
  p8: {
    title: 'Codebook audit — P8',
    task: 'Code P8 with your existing codebook. Don’t create a new code.',
    timerLabel: 'Suggested time',
    timerDone: 'Take the time you need — speed isn’t assessed.',
    finish: 'Finish P8',
    fail: 'P8 didn’t settle into the existing codebook this time. No penalty — you continue with your reconciled codebook as it stands.',
  },
  coach: {
    title: 'Coach check-in',
    complete: 'Complete check-in',
  },
  done: {
    title: 'Codebook built',
    next: 'Continue to Gameplay 2',
    nextNote: 'Gameplay 2 is the next build step.',
  },
}

/* ============================== GAMEPLAY 2 ============================== */

export const EXACT2 = {
  /** Original storyboard, Scene 5 S5-Narrowed feedback (word for word). */
  narrowedFeedback:
    'You didn’t ignore P7 — good. But watch what happened to your theme: it\'s now so specific to the private-doubt/public-performance gap that it barely covers P1 or P6, who never really performed a public account at all. A negative case should sharpen a theme\'s edges, not shrink its core. Test whether your revision still explains the excerpts that were never in question.',
  p7ArrivesTitle: 'P7 added — late transcript',
}

export const COPY2 = {
  count: {
    title: 'How many categories?',
    task: 'Decide how many categories to aim for before you sort.',
    confirm: 'Open Sort into Bins',
    warnings: {
      overgeneralised: 'Over-generalisation risk: with two categories, at least one will have to hold codes that work by different mechanisms.',
      fragmented: 'Fragmentation risk: with this many categories, containers start to become near-duplicates of single codes.',
    },
  },
  sort: {
    title: 'Sort into Bins',
    task: 'Place every code in a category. Name each category for what it holds.',
    finish: 'Finish categories',
    needAll: 'Every code needs a category, and every category needs at least one code.',
  },
  s4: {
    mechanism: { title: 'Mechanism-based categories', text: 'Each category holds codes that work the same way underneath. The categories explain, rather than sort.' },
    outcome: { title: 'Outcome bins', text: 'Some categories gather codes because they end in the same place — not attending — rather than because they work the same way. That makes them vague.' },
    miscount: { title: 'Category count outside the useful range', text: 'The grouping logic holds, but the number of categories pushes either unrelated codes together or near-duplicates apart.' },
    miscountOutcome: { title: 'Vague and miscounted', text: 'Outcome-based bins and an out-of-range count compound each other. The negative case still to come will be harder to place against either structure.' },
  },
  rank: {
    title: 'Rank candidate themes',
    task: 'Order the three candidate themes by how well the data supports them.',
    confirm: 'Confirm ranking',
  },
  p7Arrives:
    'A transcript the team added late has come in. Before you settle on a theme, read P7 and test your top-ranked theme against it.',
  stress: {
    title: 'Stress-test the theme',
    task: 'Test your top-ranked theme against P7.',
    commit: 'Record theme revision',
  },
  s5: {
    integrated: {
      title: 'Theme sharpened by the negative case',
      text: 'P7 now marks where the theme stops: entitlement explains who never starts; fit explains who stops. The theme is sharper and still covers P1–P6.',
    },
    narrowedTitle: 'Theme over-corrected',
    misranked:
      'P7 has been taken seriously, but the theme it was tested against isn’t the one the data supports most strongly, so the revision can’t explain the cases that were never in question.',
    dismissed: {
      title: 'Negative case set aside',
      text: 'Setting P7 aside keeps the theme tidy, but the tidiness is borrowed. A case that doesn’t fit is information about the theme’s boundary, not noise.',
    },
  },
  dots: {
    title: 'Connect the Dots (optional)',
    text: 'Link the two interviewer field notes to the theme on the interpretation map.',
    open: 'Open interpretation map',
  },
  done: { next: 'Continue to Gameplay 3' },
}

/* ============================== GAMEPLAY 3 ============================== */

export const COPY3 = {
  jigsaw: {
    title: 'Jigsaw Assembly',
    task: 'Connect categories → theme → excerpt evidence until every claim traces back to the data.',
    next: 'Continue to memo',
  },
  memo: {
    title: 'Structured Memo',
    task: 'Write the interpretation you will send to the Dean.',
    fields: {
      themeClaim: { label: 'Theme claim', hint: 'What is the theme? One or two sentences.' },
      strongestEvidence: { label: 'Strongest supporting evidence', hint: 'Choose the quotation that most strongly supports the claim, and say why.' },
      reconciliationNote: { label: 'Reconciliation and evidence-trail note', hint: 'How did coder disagreement (P4) change the codebook?' },
      negativeCaseTreatment: { label: 'How P7 changed or tested the theme', hint: 'What did the negative case do to the theme’s boundaries?' },
      finalInterpretation: { label: 'Final interpretation', hint: 'What should the Dean take from this?' },
    },
    review: 'Review',
    edit: 'Edit',
    confirm: 'I confirm this is the interpretation I am sending to the Dean.',
    submit: 'Submit report',
  },
  review: {
    from: 'Dr. Marsh',
    title: 'Supervisor Challenge Memo',
    intro: 'Before this goes to the Dean, three questions on your interpretation.',
    submit: 'Send responses',
    postures: { defend: 'Defend', qualify: 'Qualify', revise: 'Revise' },
  },
}

/* ============================== ENDING ============================== */

export const EXACT_END = {
  challengeIntro: 'Dr. Marsh\'s questions were generated directly from your own theme and evidence choices.',
  challengeOutro:
    'A theme that survives a good-faith challenge from a colleague is one you can trust in front of the Dean — and in front of a room that isn’t as friendly as this one.',
  challengeHeading: 'How your interpretation held up under challenge',
  reflectExcess:
    'If you saw the fragmented-segmentation or overfitted-codebook warning at any point, what pulled you in that direction — a wish to be thorough, or a wish to avoid being told your code was "wrong" for missing something?',
}

export const COPY_END = {
  title: 'Analytical Integrity Debrief',
  sent: 'Your report packet has gone to the Dean exactly as you submitted it.',
  reflectGeneral: 'Which single decision most changed what you were able to see later in the analysis?',
  reflectGate:
    'Peer review didn’t unlock this time. Look back at the decisions below — which single one, replayed differently, would most likely have unlocked it?',
  reflectUnlocked: 'Which of Dr. Marsh’s challenges was hardest to answer from the data, and why?',
}
