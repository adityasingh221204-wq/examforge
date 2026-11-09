// EXAMFORGE — Study Book file export.
// Produces one self-contained .html file for a subject: no scripts, no network, no app.
// Open it on a phone in aeroplane mode, read it, print it, or send it to a Kindle/PDF.

const FILE_CSS = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body {
  margin: 0 auto; max-width: 46rem; padding: 28px 20px 60px;
  background: #fdfcf8; color: #1c1a17;
  font-family: -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 16px; line-height: 1.62;
}
.kicker { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #756d60; }
h1 { font-size: 1.8rem; margin: 6px 0 4px; letter-spacing: -.01em; }
h2 { font-size: 1.3rem; margin: 0 0 4px; }
h3 { font-size: 1.06rem; margin: 0; flex: 1; min-width: 12rem; }
h4 { font-size: 11px; text-transform: uppercase; letter-spacing: .09em; color: #6d6457; margin: 20px 0 5px; }
p { margin: 0 0 10px; color: #2a2723; }
ul { margin: 0 0 10px; padding-left: 20px; color: #2a2723; }
li { margin-bottom: 4px; }
a { color: #3d3560; }
.lead { font-size: 1.02rem; color: #16130f; }
.book-chapter { margin: 34px 0 8px; padding-top: 18px; border-top: 2px solid #e4dfd3; }
.book-chapter:first-of-type { border-top: 0; padding-top: 0; }
.book-sub { color: #6d6457; font-size: .8rem; }
.book-topic { margin: 26px 0 0; padding-bottom: 18px; border-bottom: 1px dashed #e2ddd1; }
.book-topic-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.book-num {
  font-size: .74rem; font-weight: 700; color: #3d3560;
  border: 1px solid #cfc6e2; background: #f1eef8; border-radius: 6px; padding: 1px 6px;
}
.book-terms-line { color: #6d6457; font-size: .82rem; margin-top: 3px; }
.formula {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .9rem;
  background: #f4f1e9; border: 1px solid #e0dacd; border-radius: 8px;
  padding: 9px 11px; margin: 0 0 8px; overflow-wrap: anywhere;
}
.formula small { display: block; font-family: inherit; color: #6d6457; margin-top: 5px; font-size: .74rem; }
table { width: 100%; border-collapse: collapse; font-size: .86rem; margin: 0 0 12px; }
th, td { border-bottom: 1px solid #e6e1d6; padding: 7px 8px; text-align: left; vertical-align: top; }
th { color: #4a443b; font-size: .8rem; }
figure { margin: 0 0 12px; }
figcaption { font-size: 10px; text-transform: uppercase; letter-spacing: .09em; color: #6d6457; margin-bottom: 6px; }
footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e4dfd3; color: #6d6457; font-size: .76rem; }
@media print {
  body { max-width: none; padding: 0; font-size: 11.5pt; background: #fff; }
  .book-chapter { break-before: page; }
  .book-chapter:first-of-type { break-before: auto; }
  .book-topic { break-inside: avoid-page; }
  a { color: #000; text-decoration: none; }
  @page { margin: 16mm 14mm; }
}
`;

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface BookFileInput {
  title: string;
  kicker: string;
  subtitle: string;
  /** Rendered book markup, already stripped of app controls. */
  bodyHtml: string;
}

/** Wrap the rendered book body in a standalone document that needs nothing else to open. */
export function bookFileHtml({ title, kicker, subtitle, bodyHtml }: BookFileInput): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>${FILE_CSS}</style>
</head>
<body>
<header>
  <div class="kicker">${escapeHtml(kicker)}</div>
  <h1>${escapeHtml(title)}</h1>
  <p class="book-sub">${escapeHtml(subtitle)}</p>
</header>
${bodyHtml}
<footer>EXAMFORGE study book — saved for offline reading. Progress in the app is not affected by this file.</footer>
</body>
</html>
`;
}

/** Read the rendered book from the page and drop the interactive controls. */
export function bookBodyMarkup(root: ParentNode): string {
  const clone = (root.querySelector('.book-body') as HTMLElement | null)?.cloneNode(true) as HTMLElement | null;
  if (!clone) return '';
  clone.querySelectorAll('button, .book-note').forEach((n) => n.remove());
  return clone.innerHTML;
}

export function downloadFile(name: string, contents: string): void {
  const blob = new Blob([contents], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
