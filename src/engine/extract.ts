// EXAMFORGE — file text extraction for the material ingest page.
//
// Runs entirely in the browser: nothing is uploaded. PDFs are parsed with
// pdf.js, which is loaded lazily so the main bundle stays small; plain text,
// Markdown, CSV, JSON and HTML are read directly.
//
// Scanned PDFs (images only) have no text layer — they are reported as such
// rather than silently producing empty material.

import { cleanText } from './ingest';

export interface ExtractResult {
  text: string;
  warnings: string[];
  pages?: number;
}

export const ACCEPTED_EXTENSIONS = [
  '.pdf',
  '.txt',
  '.md',
  '.markdown',
  '.csv',
  '.tsv',
  '.json',
  '.html',
  '.htm',
  '.tex',
  '.log',
];

export const UNSUPPORTED_EXTENSIONS = ['.doc', '.docx', '.ppt', '.pptx', '.odt', '.rtf', '.zip', '.png', '.jpg', '.jpeg', '.webp'];

export function extensionOf(name: string): string {
  const match = name.toLowerCase().match(/\.[a-z0-9]+$/);
  return match?.[0] ?? '';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function htmlToText(html: string): string {
  const withoutHead = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<head[\s\S]*?<\/head>/gi, ' ');
  const spaced = withoutHead
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, ' ');
  return spaced
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function jsonToStrings(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const out: string[] = [];
    const walk = (value: unknown) => {
      if (typeof value === 'string') out.push(value);
      else if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') Object.values(value as Record<string, unknown>).forEach(walk);
    };
    walk(parsed);
    return out.join('\n');
  } catch {
    return raw;
  }
}

async function extractPdf(file: File): Promise<ExtractResult> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const warnings: string[] = [];
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    let pageText = '';
    let lastY: number | null = null;
    for (const rawItem of content.items) {
      const item = rawItem as { str?: string; hasEOL?: boolean; transform?: number[] };
      if (typeof item.str !== 'string') continue;
      const y = item.transform?.[5] ?? null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 3) pageText += '\n';
      pageText += item.str;
      if (item.hasEOL) pageText += '\n';
      lastY = y;
    }
    pages.push(`Page ${pageNumber}\n${pageText}`);
  }

  await doc.destroy();

  const text = cleanText(pages.join('\n\n'));
  if (text.replace(/\s/g, '').length < 40) {
    warnings.push('This PDF appears to be scanned images with no text layer. Run OCR (or paste the text) and try again.');
  }
  return { text, warnings, pages: doc.numPages };
}

export async function extractTextFromFile(file: File): Promise<ExtractResult> {
  const ext = extensionOf(file.name);
  const warnings: string[] = [];

  if (UNSUPPORTED_EXTENSIONS.includes(ext)) {
    throw new Error(
      `${ext} files cannot be read directly. Export the document as PDF or plain text, or paste the text into the box.`,
    );
  }
  if (ext === '.pdf' || file.type === 'application/pdf') {
    const result = await extractPdf(file);
    return { ...result, warnings: [...warnings, ...result.warnings] };
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('Files larger than 20 MB are not supported — split the document or paste the relevant chapters.');
  }

  const raw = await file.text();
  let text = raw;
  if (ext === '.html' || ext === '.htm') text = htmlToText(raw);
  if (ext === '.json') text = jsonToStrings(raw);
  text = cleanText(text);

  if (text.replace(/\s/g, '').length < 20) {
    throw new Error('That file contains no readable text.');
  }
  if (text.length > 400_000) {
    warnings.push('This document is very large — only the first part is analysed in detail. Split it for best results.');
    text = text.slice(0, 400_000);
  }
  return { text, warnings };
}

export async function readClipboardText(): Promise<string> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) return '';
  try {
    return await navigator.clipboard.readText();
  } catch {
    return '';
  }
}
