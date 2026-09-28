const TOPICS = [
  {
    id: 'technology',
    label: 'Technology & capabilities',
    keywords: ['technology', 'technologies', 'technical', 'capability', 'capabilities', 'ai', 'artificial intelligence', 'automation', 'automate', 'automated', 'model', 'models', 'algorithm', 'algorithms', 'software', 'feature', 'features', 'integration', 'integrations', 'api', 'apis'],
    title: 'Clarify capability needs',
    action: 'Ask which capability matters for the use case and what a useful demonstration would show.',
  },
  {
    id: 'governance',
    label: 'Governance & accountability',
    keywords: ['governance', 'accountability', 'accountable', 'oversight', 'policy', 'policies', 'compliance', 'regulation', 'regulations', 'regulatory', 'audit', 'audits', 'approval', 'approvals', 'responsibility', 'responsibilities', 'owner', 'ownership', 'responsible', 'ethics', 'ethical'],
    title: 'Clarify decision ownership',
    action: 'Ask who should own the decision, which approvals apply, and how accountability will be recorded.',
  },
  {
    id: 'data-privacy',
    label: 'Data & privacy',
    keywords: ['data', 'privacy', 'private', 'security', 'secure', 'consent', 'retention', 'confidential', 'confidentiality', 'encryption', 'personal information', 'sensitive information', 'gdpr'],
    title: 'Clarify data safeguards',
    action: 'Ask what data would be involved and which access, consent, retention, or privacy requirements need clarification.',
  },
  {
    id: 'trust-evidence',
    label: 'Trust & evidence',
    keywords: ['trust', 'trusted', 'trustworthy', 'evidence', 'proof', 'prove', 'accuracy', 'accurate', 'reliable', 'reliability', 'validation', 'validate', 'validated', 'benchmark', 'benchmarks', 'transparency', 'transparent', 'explainability', 'explainable', 'hallucination', 'hallucinations', 'bias', 'biased'],
    title: 'Define useful evidence',
    action: 'Ask what evidence, evaluation criteria, or limitations participants would need to assess the proposal.',
  },
  {
    id: 'people-change',
    label: 'People & change',
    keywords: ['people', 'change', 'adoption', 'training', 'onboarding', 'staff', 'team', 'teams', 'employee', 'employees', 'workforce', 'user', 'users', 'skill', 'skills', 'resistance', 'engagement', 'change management'],
    title: 'Clarify support for people',
    action: 'Ask who would be affected and what training, involvement, or adoption support they would find useful.',
  },
  {
    id: 'cost-value',
    label: 'Cost & value',
    keywords: ['cost', 'costs', 'budget', 'budgets', 'price', 'pricing', 'value', 'roi', 'return on investment', 'expense', 'expenses', 'funding', 'savings', 'benefit', 'benefits', 'payback', 'afford', 'affordable'],
    title: 'Define value and constraints',
    action: 'Ask which costs, budget constraints, and measures of value should guide the next decision.',
  },
  {
    id: 'implementation',
    label: 'Implementation & timing',
    keywords: ['implementation', 'implement', 'implementing', 'deployment', 'deploy', 'rollout', 'roll out', 'timeline', 'timing', 'time', 'schedule', 'deadline', 'deadlines', 'milestone', 'milestones', 'pilot', 'launch', 'roadmap', 'delivery', 'week', 'weeks', 'month', 'months', 'today', 'tomorrow'],
    title: 'Clarify a feasible next step',
    action: 'Ask which implementation step, dependencies, and timing participants want to explore next.',
  },
];

const CONCERN_CUES = ['concern', 'concerns', 'concerned', 'worry', 'worries', 'worried', 'risk', 'risks', 'risky', 'blocker', 'blockers', 'blocked', 'uncertain', 'unsure', 'not sure', 'challenge', 'challenges'];
const COMMITMENT_ACTIONS = 'send|share|provide|prepare|review|confirm|follow up|schedule|check|draft|deliver|update|test|investigate|contact|arrange|document|submit|set up|report|bring|create|complete|finish|own|take|run|implement|deploy|start';
const COMMITMENT_PATTERN = new RegExp(`(?:^| )(?:i will|we will|i shall|we shall|i'll|we'll|i am going to|we are going to|i commit to|we commit to|i agree to|we agree to|i promise to|we promise to) (?:${COMMITMENT_ACTIONS})(?: |$)`, 'u');
const QUESTION_OPENING = /^(?:(?:can|could|would|should|will|do|does|did|is|are|was|were|have|has) (?:i|we|you|they|it|this|that|there|the)|(?:who|what|when|where|why|how) (?:is|are|was|were|do|does|did|can|could|would|should|will|has|have|much|many))(?: |$)/u;

function words(text) {
  return text.normalize('NFKC').toLowerCase().replaceAll('’', "'")
    .match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*(?:'[\p{L}\p{M}\p{N}]+)*/gu) ?? [];
}

function normalized(text) {
  return ` ${words(text).join(' ')} `;
}

function matchesTopic(text, topic) {
  return topic.keywords.some((keyword) => text.includes(` ${keyword} `));
}

function parseLine(text, index) {
  const match = text.match(/^\s*([\p{L}][\p{L}\p{M}\p{N} ._'’()-]{0,59}):\s*(.*)$/u);
  const hasSpeaker = match && !match[2].startsWith('//')
    && !/^(?:https?|ftp|mailto|data|javascript)$/iu.test(match[1].trim());
  return {
    line: index + 1,
    speaker: hasSpeaker ? match[1].trim() : 'Unattributed',
    text,
    content: hasSpeaker ? match[2] : text,
  };
}

function evidenceFor({ line, speaker, text }) {
  return { line, speaker, text };
}

function questionCandidate(text) {
  const withoutUrls = text.replace(/https?:\/\/\S+/giu, '');
  return /[?？]/u.test(withoutUrls) || QUESTION_OPENING.test(words(text).join(' '));
}

function concernCandidate(text) {
  const clauses = normalized(text).split(/[ ](?:but|however|yet)[ ]/u);
  return clauses.some((clause) => CONCERN_CUES.some((cue) => {
    const tokens = clause.trim().split(' ');
    const cueTokens = cue.split(' ');
    return tokens.some((token, index) => {
      if (token !== cueTokens[0] || !cueTokens.every((part, offset) => tokens[index + offset] === part)) return false;
      const before = tokens.slice(Math.max(0, index - 3), index);
      const negated = before.some((part) => ['no', 'not', 'never', 'without', "isn't", "aren't", "wasn't", "weren't", "don't", "doesn't"].includes(part));
      const after = tokens.slice(index + cueTokens.length, index + cueTokens.length + 2).join(' ');
      return !negated && !/^(?:is|are) (?:absent|resolved)$/u.test(after);
    });
  }));
}

function sentences(text) {
  return text.match(/[^.!?;。！？]+[.!?;。！？]?/gu) ?? [];
}

function alignmentFor(intendedFocus, topics) {
  const focus = normalized(intendedFocus);
  const intendedTopics = TOPICS.filter((topic) => matchesTopic(focus, topic)).map((topic) => topic.label);
  const observedTopics = topics.slice(0, 3).map((topic) => topic.label);
  const overlap = intendedTopics.filter((label) => observedTopics.includes(label));
  let status = 'unclear';
  let summary;
  if (!intendedTopics.length) {
    summary = 'No intended theme was recognized from the optional focus. This keyword heuristic cannot assess alignment.';
  } else if (!observedTopics.length) {
    summary = 'No transcript themes matched the English keyword rules. Alignment is unclear, not evidence of a mismatch.';
  } else if (overlap.length) {
    status = 'aligned';
    summary = `${overlap.length} of ${intendedTopics.length} recognized intended themes overlap with the leading transcript themes. This is heuristic ${overlap.length < intendedTopics.length ? 'partial ' : ''}overlap, not a measure of meeting success.`;
  } else {
    status = 'shifted';
    summary = 'The recognized intended themes do not overlap with the leading transcript themes under these keyword rules. This suggests a possible shift, not a confirmed mismatch or an inference about anyone’s intent.';
  }
  return { intendedTopics, observedTopics, overlap, status, summary };
}

function recommendationsFor(topics, questions, concerns, commitments, excerpts) {
  const recommendations = topics.slice(0, 3).map((topic) => {
    const template = TOPICS.find(({ id }) => id === topic.id);
    return {
      title: template.title,
      action: template.action,
      rationale: `The linked excerpt matched ${topic.label} keywords. This template is a discussion prompt, not a finding about participants.`,
      evidence: topic.evidence.slice(0, 2),
    };
  });
  if (questions.length) {
    recommendations.push({
      title: 'Check the question candidate',
      action: 'Ask whether the linked question was addressed elsewhere and whether participants want any follow-up.',
      rationale: 'An explicit question marker or opening was found. The heuristic does not establish whether the question remains unresolved.',
      evidence: questions.slice(0, 2),
    });
  }
  if (concerns.length) {
    recommendations.push({
      title: 'Clarify the stated concern candidate',
      action: 'Ask participants to clarify the linked wording, its context, and whether any response is needed.',
      rationale: 'The linked wording contains a concern cue; this is not an inference about hidden feelings or intent.',
      evidence: concerns.slice(0, 2),
    });
  }
  if (commitments.length) {
    recommendations.push({
      title: 'Verify the commitment candidate',
      action: 'Confirm whether the apparent next step was agreed, who owns it, and whether its timing or current status needs updating.',
      rationale: 'An explicit first-person future-action phrase was found. It does not prove an unconditional promise or that work was completed.',
      evidence: commitments.slice(0, 2),
    });
  }
  if (!recommendations.length) {
    recommendations.push({
      title: 'Clarify the conversation focus',
      action: 'Ask participants which themes matter in the linked excerpt and whether they want to record a next step.',
      rationale: 'No known topic or extraction cue matched. The excerpt is context for a template question, not evidence of missing priorities.',
      evidence: [evidenceFor(excerpts.find(({ content }) => /\p{L}/u.test(content)))],
    });
  }
  return recommendations;
}

export function analyzeConversation({ transcript, intendedFocus = '' } = {}) {
  if (typeof transcript !== 'string') throw new TypeError('Transcript must be a string.');
  if (typeof intendedFocus !== 'string') throw new TypeError('Intended focus must be a string.');
  if (transcript.length > 40000) throw new RangeError('Transcript must be 40,000 characters or fewer.');
  if (intendedFocus.length > 500) throw new RangeError('Intended focus must be 500 characters or fewer.');

  const excerpts = transcript.split(/\r\n|\n|\r/u).map(parseLine).filter(({ text }) => text.trim());
  if (!excerpts.some(({ content }) => /\p{L}/u.test(content))) {
    throw new Error('Transcript must contain at least one word beyond any speaker label.');
  }

  const topics = TOPICS.map((topic) => {
    const evidence = excerpts.filter(({ content }) => matchesTopic(normalized(content), topic)).map(evidenceFor);
    return { id: topic.id, label: topic.label, mentions: evidence.length, percent: 0, evidence };
  }).filter(({ mentions }) => mentions > 0).sort((a, b) => b.mentions - a.mentions);
  const totalMatches = topics.reduce((total, topic) => total + topic.mentions, 0);
  for (const topic of topics) topic.percent = Math.round(topic.mentions / totalMatches * 1000) / 10;

  const questions = excerpts.filter(({ content }) => questionCandidate(content)).map(evidenceFor);
  const concerns = excerpts.filter(({ content }) => sentences(content).some(concernCandidate)).map(evidenceFor);
  const commitments = excerpts.filter(({ content }) => sentences(content).some((sentence) => (
    !questionCandidate(sentence) && COMMITMENT_PATTERN.test(normalized(sentence))
  ))).map(evidenceFor);

  return {
    turnCount: excerpts.length,
    wordCount: excerpts.reduce((total, { content }) => total + words(content).length, 0),
    topics,
    questions,
    concerns,
    commitments,
    alignment: alignmentFor(intendedFocus, topics),
    recommendations: recommendationsFor(topics, questions, concerns, commitments, excerpts),
    limitations: [
      'This is a deterministic, local, rule-based heuristic, not AI or a language model. It makes no network requests and stores nothing.',
      'English keyword matches and extraction rules can miss context, negation, paraphrases, quotations, and other languages. Review all candidates against their source.',
      'Each nonblank source line is an excerpt, not necessarily a speaker turn. Speaker labels are guessed from name-like colon prefixes; roles are not inferred.',
      'Word counts are Unicode letter/number token estimates excluding recognized speaker prefixes, not language-aware segmentation or time spoken.',
      'Topics count matching excerpts, once per topic per excerpt. Percentages use total topic matches, allow overlapping themes, and are rounded to one decimal place.',
      'Alignment compares recognized intended themes with up to three leading matched themes. Any overlap yields aligned; no recognized themes yields unclear. It does not establish meeting success or customer-only priorities.',
      'Questions, concerns, and commitments are candidates, not findings that questions are unresolved, promises are completed, or participants have particular emotions, diagnoses, personalities, or intentions.',
      'Recommendations are contextual template questions or actions. Linked lines are source evidence, not research citations or psychological findings; no external research is claimed.',
    ],
  };
}
