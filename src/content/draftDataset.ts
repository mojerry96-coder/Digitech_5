/**
 * DRAFT CONTENT — placeholder only.
 *
 * Storyboard §10.6 lists these as build-blocking assets that the source did
 * not supply. They are drafted here so the simulation runs end to end and
 * MUST be replaced with the authored content before sign-off.
 * Only P8 and the lead-researcher line are exact source text.
 */

export const DRAFT = true

export type ParticipantId = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'P8'

export interface SourceDocument {
  participant: ParticipantId
  title: string
  /** Document variables, shown as ATLAS.ti document groups. */
  year: string
  faculty: string
  paragraphs: string[]
  /** true = text is placeholder, not authored source content. */
  draft: boolean
  /** Revealed only when a gate is met (P7 in Gameplay 2, P8 on the S3A route). */
  gated?: 'P7' | 'P8'
}

export const PARTICIPANT_COLOURS: Record<ParticipantId, string> = {
  P1: '#14B8A6',
  P2: '#FB7185',
  P3: '#EAB308',
  P4: '#6366F1',
  P5: '#F43F5E',
  P6: '#64748B',
  P7: '#84CC16',
  P8: '#D946EF',
}

export const LEAD_RESEARCHER_LINE = 'Don’t force it into a clean story. Find out what\'s actually there.'

export const documents: SourceDocument[] = [
  {
    participant: 'P1',
    title: 'P1 Interview (first-year, engineering)',
    year: 'First year',
    faculty: 'Engineering',
    draft: true,
    paragraphs: [
      'Interviewer: Have you ever thought about using the wellbeing service?',
      'P1: Honestly, I think it\'s a good thing that it exists. When we had the induction talk I remember thinking, fair play, that\'s properly set up. The website is clear and they do drop-ins.',
      'P1: But I\'ve not been. I\'m not really someone who talks about stuff. If something\'s getting on top of me I just go to the gym or put my headphones in and get on with the problem set. That\'s how I was brought up, you sort it yourself.',
      'Interviewer: Have you talked to anyone about that?',
      'P1: Not really. It\'s not something that comes up. My mates don\'t ask and I don\'t bring it up. I suppose if I was really bad I\'d go, but I\'ve never been that bad.',
    ],
  },
  {
    participant: 'P2',
    title: 'P2 Interview (second-year, psychology)',
    year: 'Second year',
    faculty: 'Social Sciences',
    draft: true,
    paragraphs: [
      'Interviewer: What do you think of the wellbeing service?',
      'P2: Oh, it\'s brilliant. I always tell people it\'s good. When my flatmate was having a hard time in first term I literally walked her to the door. I\'d recommend it to anyone.',
      'Interviewer: Have you used it yourself?',
      'P2: [laughs] No. No, I haven\'t actually been. I\'ve had a rough few months, to be fair, but it feels a bit dramatic to book something. Like, people would ask why I was going, and I\'d have to have an answer.',
      'P2: It\'s easier to be the one who tells everyone else to go. Then nobody worries about you.',
    ],
  },
  {
    participant: 'P3',
    title: 'P3 Interview (third-year, history)',
    year: 'Third year',
    faculty: 'Arts & Humanities',
    draft: true,
    paragraphs: [
      'Interviewer: Can you tell me about your experience with the wellbeing service?',
      'P3: I\'ll be honest, I\'m pretty critical of it. I filled in the self-referral form in October and got an email saying the wait for an initial assessment was six weeks. Six weeks. By the time they got back to me it was exam season.',
      'P3: And the appointments are all nine to five on weekdays, which is exactly when I\'m in seminars or at my job. There\'s no evening option at all.',
      'Interviewer: Did you go to the assessment in the end?',
      'P3: I went once. The person was fine, genuinely. But they said the next slot was another month away, so I just stopped chasing it. The system isn\'t built for people who work.',
    ],
  },
  {
    participant: 'P4',
    title: 'P4 Interview (first-year, nursing)',
    year: 'First year',
    faculty: 'Health Sciences',
    draft: true,
    paragraphs: [
      'Interviewer: Have you ever considered contacting the wellbeing service?',
      'P4: I thought about it, during the placement especially. I wasn\'t sleeping and I was crying in the car before shifts. But then I\'d think, I\'m on a ward with people who are actually ill. What have I got to complain about?',
      'P4: The service is for people with real problems. Proper mental health stuff. If I took an appointment I\'d feel like I was taking it off someone who needed it more than me.',
      'Interviewer: How did you manage instead?',
      'P4: I just told myself everyone finds first placement hard. It\'s normal, so it doesn\'t count. I\'m fine now. Mostly.',
    ],
  },
  {
    participant: 'P5',
    title: 'P5 Interview (second-year, law)',
    year: 'Second year',
    faculty: 'Law',
    draft: true,
    paragraphs: [
      'Interviewer: What has your experience of the wellbeing service been?',
      'P5: I booked once and then cancelled the morning of. The service is on the first floor of the Students\' Union, right above the café where everyone from my course sits. You\'d have to walk past all of them.',
      'P5: Law is very competitive. There\'s this idea that you need to look like you can handle pressure, because that\'s the job. If people on my course thought I couldn\'t cope, I think it would follow me.',
      'Interviewer: Is that about the location, or something else?',
      'P5: Both, probably. Even if it was somewhere hidden, I don\'t know. I\'m not sure I\'d think I was bad enough to go. I\'m just stressed, like everyone.',
    ],
  },
  {
    participant: 'P6',
    title: 'P6 Interview (third-year, computer science)',
    year: 'Third year',
    faculty: 'Engineering',
    draft: true,
    paragraphs: [
      'Interviewer: Have you used the wellbeing service?',
      'P6: Once, in second year. After a breakup. The counsellor was really kind and listened properly.',
      'P6: I didn\'t go back, though. I came out of it feeling like I\'d taken up an hour of her time talking about something pretty ordinary. People go through worse.',
      'Interviewer: Did you tell anyone you\'d been?',
      'P6: No. Nobody knew. It wasn\'t a secret exactly, it just never came up, and I sorted things out on my own in the end.',
    ],
  },
  {
    participant: 'P7',
    title: 'P7 Interview (second-year, international, business) — late addition',
    year: 'Second year',
    faculty: 'Business',
    draft: true,
    gated: 'P7',
    paragraphs: [
      'Interviewer: You mentioned you\'ve used the wellbeing service. Can you tell me about that?',
      'P7: Yes, I went about six times last year. I\'m very open about it; I tell my friends, I put it in our group chat. Back home my mum is a therapist so there is no shame in it for me at all. If you need help, you go.',
      'P7: But I stopped going. The counsellors kept giving me the same leaflets about sleep and breathing. Nobody asked about visas, money transfers being blocked, my family being nine hours ahead. It felt like the service was designed for a different kind of student.',
      'Interviewer: So it wasn\'t about whether you deserved the support?',
      'P7: No, I knew I deserved it. It just wasn\'t the right support for me.',
    ],
  },
  {
    participant: 'P8',
    title: 'P8 Interview (second-year, arts) — bonus',
    year: 'Second year',
    faculty: 'Arts & Humanities',
    // Exact source text (storyboard §10.4).
    draft: false,
    gated: 'P8',
    paragraphs: [
      'P8: I\'d go if I needed to. I don’t need to. I mean - I probably do, a bit. It\'s fine. I’m fine.',
    ],
  },
]

export interface FieldNote {
  id: string
  title: string
  linkedParticipant: ParticipantId
  text: string[]
  draft: boolean
}

export const fieldNotes: FieldNote[] = [
  {
    id: 'FN-P2',
    title: 'Field note — P2 interview',
    linkedParticipant: 'P2',
    draft: true,
    text: [
      'P2 was animated and warm while describing the service, and talked quickly about walking her flatmate to the door.',
      'When I asked whether she had used it herself, she laughed, glanced at the door and lowered her voice. She returned to talking about her flatmate twice before answering.',
      'After the recorder was off she said, "Don\'t put that bit in, about me having a rough time."',
    ],
  },
  {
    id: 'FN-P5',
    title: 'Field note — P5 interview',
    linkedParticipant: 'P5',
    draft: true,
    text: [
      'Interview held in a library study room at P5\'s request — P5 said the Union building was "too busy".',
      'P5 paused for a long time before saying "I\'m just stressed, like everyone", and looked at me as if checking whether that was an acceptable answer.',
      'Noticeably more relaxed once we moved to talking about the course in general.',
    ],
  },
]
