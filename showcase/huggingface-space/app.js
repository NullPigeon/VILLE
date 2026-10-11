const choices = [
  { test: /https:\/\/|web\s?page|url|article link/i, name: 'Page Reader', reason: 'This request points to a public page. A page-reading tool can extract its text for a focused summary.', service: 'agent402-extract' },
  { test: /write|draft|article|report|essay|guide|статт|доповід/i, name: 'Longform Desk', reason: 'A writing task fits a long-form model run. You review the live quote and output limit before checkout.', service: 'relay-long-form' },
  { test: /news|latest|headlines|новин/i, name: 'News Radar', reason: 'A recent-news request benefits from a live search service with dates and source links.', service: 'agent402-news' },
  { test: /search|find|look up|пошук|знайди/i, name: 'Web Scout', reason: 'A live web search can gather relevant links and snippets for the brief.', service: 'agent402-search' },
  { test: /research|study|sources|дослідж/i, name: 'Research Brief', reason: 'A research task needs source discovery and a concise synthesis.', service: 'research-brief' },
];

const task = document.getElementById('task');
const serviceName = document.getElementById('service-name');
const serviceReason = document.getElementById('service-reason');
const routeStatus = document.getElementById('route-status');
const marketLink = document.getElementById('market-link');
const routeButton = document.getElementById('route');

document.querySelectorAll('[data-example]').forEach((button) => {
  button.addEventListener('click', () => {
    task.value = button.dataset.example;
    task.focus();
  });
});

routeButton.addEventListener('click', () => {
  const brief = task.value.trim();
  if (brief.length < 10) {
    routeStatus.textContent = 'NEEDS A BRIEF';
    serviceName.textContent = 'Tell us a little more.';
    serviceReason.textContent = 'Describe a specific task in at least 10 characters.';
    return;
  }
  const match = choices.find(({ test }) => test.test(brief)) || {
    name: 'Explore the Market',
    reason: 'There is no clear single-service match in this preview. Browse the live catalogue to choose a tool for your task.',
    service: null,
  };
  routeStatus.textContent = 'PREVIEW ROUTE';
  serviceName.textContent = match.name;
  serviceReason.textContent = match.reason;
  const url = new URL('https://landville.xyz/agent-market');
  if (match.service) {
    url.searchParams.set('service', match.service);
  }
  marketLink.href = url.toString();
});
