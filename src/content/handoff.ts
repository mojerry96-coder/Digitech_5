import { LEAD_RESEARCHER_LINE } from './draftDataset'

/**
 * Case handoff (storyboard Scene 1). The instruction line is exact source text;
 * the surrounding copy restates the storyboard premise (role, two-week leave,
 * Dean's two-week deadline, P1–P6 + field notes available).
 */
export const HANDOFF = {
  from: 'Lead Researcher',
  study: 'Student Wellbeing Access Study',
  subject: 'Over to you for the next two weeks',
  greeting: (name: string) => `${name || 'Hi'},`,
  paragraphs: [
    'I’m on leave from today for two weeks. The Dean of Students expects our report at the end of that same fortnight, and will act on whatever interpretation we submit.',
    'While I’m away you’re Lead Coder. The analytical integrity of the dataset is yours, and you’ll need to be able to show how every raw excerpt became the final interpretation.',
    'The project is shared with you now: six interview transcripts (P1–P6) and the two interviewer field notes. Some students speak warmly about the service and never go; others are openly critical. It won’t reconcile easily.',
  ],
  instructionLead: 'One instruction:',
  instruction: LEAD_RESEARCHER_LINE,
  objective: 'Build an interpretation the data can defend.',
}

export const handoffMemoText = (name: string) => [
  HANDOFF.greeting(name),
  ...HANDOFF.paragraphs,
  `${HANDOFF.instructionLead} “${HANDOFF.instruction}”`,
  `Objective: ${HANDOFF.objective}`,
]
