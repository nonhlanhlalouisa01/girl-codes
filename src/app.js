import { analyzeConversation } from './analysis.js';
import { example } from './example.js';

const $ = (id) => document.getElementById(id);
const form = $('conversation-form');
const transcript = $('transcript');
const focus = $('intended-focus');
const title = $('meeting-title');
const consent = $('consent');
let currentResult = null;
let currentTitle = '';
let isExample = false;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function announce(message) {
  $('live-status').textContent = message;
}

function updateCount() {
  $('character-count').textContent = `${transcript.value.length.toLocaleString('en')} / 40,000`;
}

function selectTab(name, moveFocus = false) {
  for (const view of ['overview', 'evidence', 'next']) {
    const selected = view === name;
    $(`tab-${view}`).setAttribute('aria-selected', String(selected));
    $(`tab-${view}`).tabIndex = selected ? 0 : -1;
    $(`panel-${view}`).hidden = !selected;
  }
  if (moveFocus) $(`tab-${name}`).focus();
}

function sourceCard(evidence) {
  const card = element('div', undefined, 'evidence-item');
  card.append(
    element('p', `Line ${evidence.line} · ${evidence.speaker}`),
    element('blockquote', evidence.text),
  );
  return card;
}

function renderEvidence(result) {
  const container = $('evidence-groups');
  container.replaceChildren();
  const groups = [
    ['Questions to revisit', result.questions, 'These questions may have been answered later. Verify before following up.'],
    ['Explicit concern candidates', result.concerns, 'Concern-related wording is a cue to read the full context, not a sentiment assessment.'],
    ['Commitment & follow-up candidates', result.commitments, 'Confirm the owner, date and status. A mention is not proof of a commitment.'],
    ...result.topics.map((topic) => [`${topic.label} · source evidence`, topic.evidence, '']),
  ];
  for (const [label, evidence, caveat] of groups) {
    const group = element('section', undefined, 'evidence-group');
    const heading = element('h4', label);
    heading.append(element('span', `${evidence.length} excerpt${evidence.length === 1 ? '' : 's'}`));
    group.append(heading);
    if (caveat) group.append(element('p', caveat, 'field-help'));
    if (!evidence.length) group.append(element('p', 'No matching excerpts found. This does not mean the topic was absent.', 'evidence-empty'));
    for (const item of evidence) group.append(sourceCard(item));
    container.append(group);
  }
}

function renderRecommendations(result) {
  const container = $('recommendations');
  container.replaceChildren();
  for (const [index, recommendation] of result.recommendations.entries()) {
    const card = element('article', undefined, 'recommendation');
    card.append(
      element('h4', `${String(index + 1).padStart(2, '0')} · ${recommendation.title}`),
      element('p', recommendation.action),
      element('p', `Why consider this: ${recommendation.rationale}`),
    );
    if (recommendation.evidence.length) {
      const details = element('details');
      details.append(element('summary', 'See the conversation evidence'));
      for (const evidence of recommendation.evidence) details.append(sourceCard(evidence));
      card.append(details);
    }
    container.append(card);
  }
  if (!result.recommendations.length) {
    container.append(element('p', 'There is not enough recognised evidence for topic-specific prompts. Review the source conversation and ask the participants what needs clarification.', 'evidence-empty'));
  }
  const limitations = element('section', undefined, 'evidence-group');
  limitations.append(element('h4', 'Keep these limits in mind'));
  for (const limitation of result.limitations) limitations.append(element('p', limitation, 'panel-intro'));
  container.append(limitations);
}

function renderResult(result, sample = false) {
  currentResult = result;
  currentTitle = title.value.trim() || 'Untitled conversation';
  isExample = sample;
  $('form-error').hidden = true;
  $('empty-state').hidden = true;
  $('result-content').hidden = false;
  $('export-button').disabled = false;
  $('demo-banner').hidden = !sample;
  $('result-kind').textContent = sample ? 'FICTIONAL EXAMPLE' : 'LOCAL REFLECTION';
  $('result-title').textContent = currentTitle;
  $('excerpt-count').textContent = `${result.turnCount} excerpts`;
  const alignmentCopy = {
    aligned: ['A POINT OF CONNECTION', 'Your intended themes surfaced.'],
    shifted: ['A DIFFERENT EMPHASIS', 'There may be more to the conversation.'],
    unclear: ['ROOM FOR HUMAN CONTEXT', 'Some things need a closer listen.'],
  };
  const [label, heading] = alignmentCopy[result.alignment.status];
  $('alignment-label').textContent = label;
  $('alignment-heading').textContent = heading;
  $('alignment-summary').textContent = result.alignment.summary;
  $('intended-summary').textContent = result.alignment.intendedTopics.join(' · ') || focus.value.trim() || 'No intended focus provided';
  $('observed-summary').textContent = result.alignment.observedTopics.join(' · ') || 'No recognised topic signals';

  const topics = $('topic-list');
  topics.replaceChildren();
  for (const topic of result.topics) {
    const row = element('div', undefined, 'topic-row');
    const bar = element('progress', undefined, 'topic-bar');
    bar.max = 100;
    bar.value = topic.percent;
    bar.setAttribute('aria-label', `${topic.label}: ${topic.percent}% of topic matches across ${topic.mentions} excerpts`);
    row.append(element('span', topic.label, 'topic-name'), bar, element('span', `${topic.percent}%`, 'topic-value'));
    topics.append(row);
  }
  if (!result.topics.length) topics.append(element('p', 'No topics matched the prototype’s English keyword rules. Review the conversation yourself; absence of a match is not absence of a theme.', 'evidence-empty'));

  const spotlight = result.topics[0]?.evidence[0] || result.questions[0] || result.concerns[0] || result.commitments[0];
  $('spotlight-quote').textContent = spotlight?.text || 'No recognised evidence to spotlight. Your source transcript remains the best place to start.';
  $('spotlight-source').textContent = spotlight ? `Line ${spotlight.line} · ${spotlight.speaker} · source excerpt` : 'No interpretation generated';
  renderEvidence(result);
  renderRecommendations(result);
  selectTab('overview');
  announce(sample ? 'Fictional example loaded. All results are from example data.' : 'Meeting Mirror ready. Review the reflection, evidence and next conversation prompts.');
}

function invalidateResult() {
  currentResult = null;
  isExample = false;
  $('result-content').hidden = true;
  $('empty-state').hidden = false;
  $('export-button').disabled = true;
  $('demo-banner').hidden = true;
  $('result-kind').textContent = 'READY WHEN YOU ARE';
  $('form-error').hidden = true;
  updateCount();
}

function loadExample() {
  title.value = example.title;
  focus.value = example.intendedFocus;
  transcript.value = example.transcript;
  consent.checked = false;
  updateCount();
  renderResult(analyzeConversation(example), true);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!consent.checked) {
    $('form-error').textContent = 'Confirm that you are authorised to use this conversation first.';
    $('form-error').hidden = false;
    consent.focus();
    return;
  }
  try {
    const result = analyzeConversation({ transcript: transcript.value, intendedFocus: focus.value });
    renderResult(result);
    $('panel-overview').focus();
  } catch (error) {
    invalidateResult();
    $('form-error').textContent = error instanceof Error ? error.message : 'Unable to analyse this conversation.';
    $('form-error').hidden = false;
    transcript.focus();
  }
});

for (const field of [title, focus, transcript]) {
  field.addEventListener('input', () => {
    if (currentResult) announce('Conversation changed. Create a new Meeting Mirror to refresh the results.');
    if (field === transcript) consent.checked = false;
    invalidateResult();
  });
}

$('load-example').addEventListener('click', () => {
  if (!isExample && (transcript.value || title.value || focus.value) && !window.confirm('Replace your current conversation with the fictional example? Unsaved conversation text and results will be cleared.')) return;
  loadExample();
});

$('clear-session').addEventListener('click', () => {
  form.reset();
  invalidateResult();
  // Remove hidden source excerpts as well as the active result.
  for (const id of ['result-title', 'excerpt-count', 'alignment-summary', 'intended-summary', 'observed-summary', 'topic-list', 'spotlight-quote', 'spotlight-source', 'evidence-groups', 'recommendations']) {
    $(id).replaceChildren();
  }
  currentTitle = '';
  title.focus();
  announce('Conversation and results cleared from this page.');
});

$('export-button').addEventListener('click', () => {
  if (!currentResult) return;
  const result = currentResult;
  const lines = [
    'REASONA AI · MEETING MIRROR',
    currentTitle,
    isExample ? 'FICTIONAL EXAMPLE — not a real customer conversation' : 'LOCAL REFLECTION',
    '',
    'Rule-based prototype, not an AI or psychological assessment. Review every suggestion.',
    'Contains meeting excerpts. Share and retain only with appropriate authorisation.',
    '',
    'THE REFLECTION',
    result.alignment.summary,
    `Intended focus: ${focus.value.trim() || 'Not provided'}`,
    `Leading observed themes: ${result.alignment.observedTopics.join(', ') || 'None recognised'}`,
    '',
    'TOPIC SIGNALS (share of topic matches, not speaking time or importance)',
  ];
  for (const topic of result.topics) lines.push(`${topic.label}: ${topic.percent}% (${topic.mentions} matching excerpts)`);
  const groups = [
    ['QUESTIONS TO REVISIT — resolution unknown', result.questions],
    ['CONCERN CANDIDATES — verify context', result.concerns],
    ['COMMITMENT CANDIDATES — confirm owners and status', result.commitments],
    ...result.topics.map((topic) => [`${topic.label.toUpperCase()} — SOURCE EVIDENCE`, topic.evidence]),
  ];
  for (const [label, evidence] of groups) {
    lines.push('', label);
    for (const item of evidence) lines.push(`Line ${item.line} · ${item.speaker}: ${item.text}`);
    if (!evidence.length) lines.push('No keyword matches.');
  }
  lines.push('', 'NEXT CONVERSATION — prompts, not research-backed findings');
  for (const rec of result.recommendations) {
    lines.push('', rec.title, rec.action, `Why consider this: ${rec.rationale}`);
    for (const evidence of rec.evidence) lines.push(`Evidence, line ${evidence.line}: ${evidence.text}`);
  }
  lines.push('', 'LIMITATIONS', ...result.limitations);
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
  const link = element('a');
  link.href = url;
  link.download = 'reasona-meeting-mirror.txt';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce('Reflection downloaded. The file contains source excerpts; store and share it responsibly.');
});

const tabNames = ['overview', 'evidence', 'next'];
for (const [index, name] of tabNames.entries()) {
  $(`tab-${name}`).addEventListener('click', () => selectTab(name));
  $(`tab-${name}`).addEventListener('keydown', (event) => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabNames.length;
    if (event.key === 'ArrowLeft') next = (index + tabNames.length - 1) % tabNames.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabNames.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      selectTab(tabNames[next], true);
    }
  });
}

const dialog = $('info-dialog');
function showInfo(heading, paragraphs) {
  $('dialog-title').textContent = heading;
  $('dialog-content').replaceChildren(...paragraphs.map((text) => element('p', text)));
  dialog.showModal();
}
$('how-it-works').addEventListener('click', () => showInfo('A mirror, not a mind reader.', [
  '01 · Add context. Describe your intended message and paste an authorised English-language transcript, with one speaker turn per line.',
  '02 · Look again. Local keyword rules group observable topic signals and compare the leading themes with your intended focus. Every nonblank line counts as an excerpt, not a verified speaker turn.',
  '03 · Follow the evidence. Review source lines, questions, concern wording and potential commitments. Explore suggested prompts for the next conversation and download the reflection if useful.',
  'This prototype is not connected to an AI model. It does not process audio, retrieve research or determine whether a customer trusted, understood or agreed with your message.',
]));
$('responsible-design').addEventListener('click', () => showInfo('Your conversation. Your control.', [
  'Analysis happens entirely in this browser. This app does not upload transcripts, call an AI provider, use analytics or save conversations in cookies or browser storage. Reloading starts again with fictional data.',
  'Only use meeting information you are authorised to process. Remove unnecessary personal or sensitive data. A checkbox is a reminder, not a substitute for participant consent or your organisation’s policies.',
  'We identify observable wording, not hidden emotions, personality, honesty, intelligence or intentions. Keywords can miss nuance and negation. All speakers are included; topic frequency is not importance.',
  'Clear conversation & results removes the active conversation and rendered excerpts from this page. Downloaded files and your clipboard remain under your control and must be managed separately.',
  'Recommendations are reflection prompts, not diagnoses, verified research findings or automated decisions. Human review is essential.',
]));
$('close-dialog').addEventListener('click', () => dialog.close());
$('dialog-done').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) {
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  }
});

loadExample();
