// Minimal, dependency-free markdown → HTML for the protocol library.
// Handles headings, lists, tables, code fences, quotes, rules and inline marks.

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(s: string): string {
  let out = esc(s);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  return out;
}

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let i = 0;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      html.push(`<p>${inline(para.join(' '))}</p>`);
      para = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      flushPara();
      const lang = line.replace(/```/, '').trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      html.push(
        `<pre class="md-code"${lang ? ` data-lang="${esc(lang)}"` : ''}><code>${esc(buf.join('\n'))}</code></pre>`,
      );
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara();
      const level = h[1].length;
      const text = inline(h[2]);
      html.push(`<h${level} class="md-h${level}">${text}</h${level}>`);
      i++;
      continue;
    }

    if (/^\s*(---|___|\*\*\*)\s*$/.test(line)) {
      flushPara();
      html.push('<hr class="md-hr" />');
      i++;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      flushPara();
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
      html.push(`<blockquote class="md-quote">${inline(buf.join(' '))}</blockquote>`);
      continue;
    }

    // table
    if (/^\s*\|/.test(line) && /^\s*\|?[\s:|-]+\|/.test(lines[i + 1] ?? '')) {
      flushPara();
      const cells = (row: string) =>
        row
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim());
      const head = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(cells(lines[i++]));
      html.push(
        `<div class="md-table-wrap"><table class="md-table"><thead><tr>${head
          .map((c) => `<th>${inline(c)}</th>`)
          .join('')}</tr></thead><tbody>${rows
          .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table></div>`,
      );
      continue;
    }

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+\.\s+/, ''));
      html.push(`<ol class="md-ol">${items.map((t) => `<li>${inline(t)}</li>`).join('')}</ol>`);
      continue;
    }

    // unordered list (supports one level of nesting via indent)
    if (/^\s*[-*]\s+/.test(line)) {
      flushPara();
      const items: { text: string; indent: number }[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const indent = (lines[i].match(/^\s*/)?.[0].length ?? 0) > 1 ? 1 : 0;
        items.push({ text: lines[i].replace(/^\s*[-*]\s+/, ''), indent });
        i++;
      }
      let buf = '';
      items.forEach((it, idx) => {
        if (idx === 0) buf += `<li>${inline(it.text)}`;
        else if (it.indent > items[idx - 1].indent) buf += `<ul class="md-ul nested"><li>${inline(it.text)}</li>`;
        else {
          buf += `</li><li>${inline(it.text)}`;
        }
      });
      buf += '</li>';
      html.push(`<ul class="md-ul">${buf}</ul>`);
      continue;
    }

    if (!line.trim()) {
      flushPara();
      i++;
      continue;
    }

    para.push(line.trim());
    i++;
  }
  flushPara();
  return html.join('\n');
}

/** Strip markdown for search/preview text. */
export function plainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
