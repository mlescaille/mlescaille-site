// Lexical screen that runs before any model call. A model is not a boundary:
// employer internals, prompt injection, and obvious off-topic questions are
// refused here even if a later model would have answered them. The screen is
// deliberately blunt and will sometimes over-refuse. That is the trade.

const EMPLOYER = [
  /\bemployer(?:'s|s)?\b[^.\n]{0,80}\b(internal|confidential|customer|customers|metric|metrics|system|systems|proprietary|unreleased|revenue|incident|roadmap)/i,
  /\b(internal|confidential|proprietary|unreleased)\b[^.\n]{0,80}\bemployer/i,
  /\b(your|the) compan(?:y|ies)(?:'s|s)?\b[^.\n]{0,80}\b(internal|confidential|customer|customers|metric|metrics|system|systems|proprietary|revenue|incident|roadmap)/i,
  /\binternal (?:system|systems|tool|tools|metric|metrics|customer|customers|architecture|service|services|api|dashboard|data)\b/i,
  /\bcustomer (?:data|metrics|metric|list|lists|information|records)\b/i,
  /\b(confidential|proprietary|unreleased)\b/i,
  /\bunder an? nda\b/i,
  /\bnda\b/i,
  /\bproduction (?:incident|incidents|outage|outages|metrics|dashboard)\b/i,
];

const INJECTION = [
  /\bignore\b[^.\n]{0,40}\b(previous|prior|above|all)\b[^.\n]{0,40}\b(instruction|instructions|rules|prompt|prompts)\b/i,
  /\b(system prompt|developer message|jailbreak)\b/i,
  /\byou are now\b/i,
  /\bdisregard\b[^.\n]{0,40}\b(instruction|instructions|rules|prompt|prompts)\b/i,
  /\bdo not follow\b[^.\n]{0,40}\b(instruction|instructions|rules)\b/i,
];

const OFF_TOPIC = [
  /^(?:what(?:'s| is)|how(?:'s| is)) the weather\b/i,
  /^weather forecast\b/i,
  /\bwho won\b/i,
  /\bworld series\b/i,
  /\bstock price\b/i,
  /\brecipe for\b/i,
  /^(?:write|compose|generate) (?:me |us )?(?:a |an )?(?:poem|essay|story|email|cover letter|resume)\b/i,
  /\bcapital of\b/i,
];

export function forcedDecline(question) {
  const text = String(question ?? '');
  if (EMPLOYER.some(pattern => pattern.test(text))) return { category: 'employer' };
  if (INJECTION.some(pattern => pattern.test(text))) return { category: 'injection' };
  if (OFF_TOPIC.some(pattern => pattern.test(text))) return { category: 'off_topic' };
  return null;
}

const CODE_HINT = /\b(lore|authz|github|repository|repositories|readme|repo|screenshot|screenshots|ocr|indexeddb)\b/i;
const WRITING_HINT = /\b(essay|essays|poem|poems|poetry|wrote|written|writing|article|articles|talk|talks)\b/i;

// Used by the mock router. A real model is asked the same three-way choice
// and may still decline; this function is the deterministic stand-in.
export function localRoute(question) {
  const forced = forcedDecline(question);
  if (forced) return { route: 'decline', category: forced.category };
  const code = CODE_HINT.test(question);
  const writing = WRITING_HINT.test(question);
  if (code && !writing) return { route: 'code' };
  return { route: 'writing' };
}

export function declineAnswer(category) {
  if (category === 'employer') {
    return "I don't answer questions about an employer's internal systems, customers, metrics, or confidential details.";
  }
  return "I only answer from the public writing and the public repositories. That question is outside of them.";
}

export function unknownAnswer() {
  return "I don't know. Nothing in the pages I can speak from answers that, and I won't guess.";
}
