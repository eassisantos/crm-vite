const ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#47;',
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"'/]/g, (char) => ENTITY_MAP[char]);

const normalizeWhitespace = (input: string): string => input.replace(/\r\n|\r/g, '\n');

const applyHeadings = (content: string): string =>
  content
    .replace(/^###\s+(.*)$/gm, '<h3 class="font-semibold text-base mt-4 mb-2">$1</h3>')
    .replace(/^##\s+(.*)$/gm, '<h2 class="font-semibold text-lg mt-4 mb-2">$1</h2>')
    .replace(/^#\s+(.*)$/gm, '<h1 class="font-bold text-xl mt-4 mb-2">$1</h1>');

const applyLists = (content: string): string =>
  content.replace(/(^|\n)(-\s.*(?:\n-\s.*)*)/g, (match, prefix: string, block: string) => {
    const lines = block
      .split('\n')
      .map((line) => line.replace(/^-\s+/, '').trim())
      .filter(Boolean);
    if (lines.length === 0) {
      return match;
    }
    const items = lines
      .map((line) => `<li class="ml-4 list-disc">${line}</li>`)
      .join('');
    return `${prefix}<ul class="space-y-1">${items}</ul>`;
  });

/**
 * Converts a markdown-like string into safe HTML.
 * Only a limited subset of formatting is supported and all user provided HTML is escaped.
 */
export function renderSafeRichText(input: string): string {
  if (!input) {
    return '';
  }

  const normalized = normalizeWhitespace(input.trim());
  let safe = escapeHtml(normalized);

  const codeBlocks: string[] = [];
  safe = safe.replace(/```([\s\S]*?)```/g, (_match, code) => {
    const index = codeBlocks.push(
      `<pre class="rounded bg-slate-900 p-3 text-sm text-slate-100 overflow-auto"><code>${code}</code></pre>`
    ) - 1;
    return `__CODE_BLOCK_${index}__`;
  });

  safe = safe
    .replace(/`([^`]+)`/g, '<code class="rounded bg-slate-100 px-1 py-0.5 text-sm text-slate-700">$1</code>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');

  safe = applyHeadings(safe);
  safe = applyLists(safe);

  safe = safe
    .replace(/\n{2,}/g, '<br /><br />')
    .replace(/\n/g, '<br />');

  return safe.replace(/__CODE_BLOCK_(\d+)__/g, (_match, index) => codeBlocks[Number(index)] ?? '');
}
