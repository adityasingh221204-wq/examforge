// EXAMFORGE — Add Material: import notes/PDFs, analyse them, file them under topics.

import { useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../state/store';
import { SUBJECTS, TOPIC_MAP, unitOf } from '../data/syllabus';
import { MATERIAL_KIND_LABELS, type MaterialSectionKind, type SubjectId } from '../data/types';
import {
  ACCEPTED_EXTENSIONS,
  extractTextFromFile,
  formatBytes,
} from '../engine/extract';
import {
  AUTO_ACCEPT_CONFIDENCE,
  LOW_CONFIDENCE,
  addMaterial,
  analyseMaterial,
  materialSummary,
  removeMaterial,
  removeMaterialSource,
  searchMaterials,
  type IngestAnalysis,
  type SectionDraft,
} from '../engine/ingest';
import { prettyDate } from '../engine/dates';
import { Bar, Card, CardHead, Empty, Field } from '../components/ui';

interface Batch {
  id: string;
  name: string;
  mime: string;
  bytes: number;
  analysis: IngestAnalysis;
  warnings: string[];
}

interface Override {
  topicId: string | null;
  selected: boolean;
}

const SUBJECT_OPTIONS: { id: 'auto' | SubjectId; label: string }[] = [
  { id: 'auto', label: 'Auto-detect subject' },
  ...SUBJECTS.map((s) => ({ id: s.id as 'auto' | SubjectId, label: `${s.name} (${s.code})` })),
];

function confidenceTone(confidence: number): 'high' | 'mid' | 'low' {
  if (confidence >= AUTO_ACCEPT_CONFIDENCE) return 'high';
  if (confidence >= LOW_CONFIDENCE) return 'mid';
  return 'low';
}

function kindClass(kind: MaterialSectionKind): string {
  if (kind === 'formula') return 'lav';
  if (kind === 'definition') return 'learned';
  if (kind === 'example') return 'practised';
  return '';
}

export function Ingest() {
  const { state, set, notify } = useStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);

  const presetSubject = (params.get('subject') as SubjectId | null) ?? null;
  const presetTopic = params.get('topic');

  const [subjectMode, setSubjectMode] = useState<'auto' | SubjectId>(presetSubject ?? 'auto');
  const [pending, setPending] = useState<{ file: File }[]>([]);
  const [paste, setPaste] = useState('');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [filter, setFilter] = useState<'all' | SubjectId>('all');
  const [onlyUnmatched, setOnlyUnmatched] = useState(false);
  const [reviewQuery, setReviewQuery] = useState('');
  const [libraryQuery, setLibraryQuery] = useState('');
  const [done, setDone] = useState<{ added: number; skipped: number } | null>(null);

  const summary = materialSummary(state);
  const libraryHits = useMemo(() => searchMaterials(state, libraryQuery, 12), [state, libraryQuery]);

  // built once and reused by every block's topic picker (172 topics each)
  const topicOptions = useMemo(
    () =>
      SUBJECTS.map((s) => (
        <optgroup key={s.id} label={`${s.name} (${s.code})`}>
          {s.units.map((u) =>
            u.topics.map((t) => (
              <option key={t.id} value={t.id}>
                U{u.order} · {t.name}
              </option>
            )),
          )}
        </optgroup>
      )),
    [],
  );

  const drafts = useMemo(
    () =>
      batches.flatMap((batch) =>
        batch.analysis.sections.map((draft) => {
          const override = overrides[draft.id];
          return {
            batch,
            draft: {
              ...draft,
              topicId: override ? override.topicId : draft.topicId,
              selected: override ? override.selected : draft.selected,
            } as SectionDraft,
          };
        }),
      ),
    [batches, overrides],
  );

  const selectedCount = drafts.filter((entry) => entry.draft.selected && entry.draft.topicId && !entry.draft.duplicateOf).length;
  const needsReview = drafts.filter((entry) => !entry.draft.duplicateOf && (!entry.draft.topicId || entry.draft.confidence < AUTO_ACCEPT_CONFIDENCE)).length;
  const topicsTouched = new Set(drafts.filter((e) => e.draft.topicId && !e.draft.duplicateOf).map((e) => e.draft.topicId as string)).size;

  const filtered = drafts.filter(({ draft }) => {
    if (onlyUnmatched && (draft.topicId || draft.duplicateOf)) return false;
    if (filter !== 'all' && draft.topicId && TOPIC_MAP[draft.topicId]?.subjectId !== filter) return false;
    if (filter !== 'all' && !draft.topicId && draft.matches[0] && TOPIC_MAP[draft.matches[0].topicId]?.subjectId !== filter) {
      return false;
    }
    if (reviewQuery.trim()) {
      const q = reviewQuery.trim().toLowerCase();
      if (!`${draft.heading} ${draft.summary} ${draft.body}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const grouped = useMemo(() => {
    const map = new Map<string | null, { draft: SectionDraft; batch: Batch }[]>();
    for (const entry of filtered) {
      const key = entry.draft.duplicateOf ? '__dup' : entry.draft.topicId;
      const existing = map.get(key) ?? [];
      existing.push(entry);
      map.set(key, existing);
    }
    return [...map.entries()].sort((a, b) => {
      if (a[0] === '__dup') return 1;
      if (b[0] === '__dup') return -1;
      if (a[0] === null) return 1;
      if (b[0] === null) return -1;
      return b[1].length - a[1].length;
    });
  }, [filtered]);

  const addFiles = (files: FileList | File[]) => {
    const incoming = [...files].map((file) => ({ file }));
    setPending((cur) => [...cur, ...incoming]);
    setDone(null);
  };

  const runAnalysis = async () => {
    setBusy('Reading documents…');
    const made: Batch[] = [];
    const failures: string[] = [];
    try {
      for (const [index, item] of pending.entries()) {
        setBusy(`Reading ${item.file.name} (${index + 1}/${pending.length})…`);
        try {
          const extracted = await extractTextFromFile(item.file);
          const analysis = analyseMaterial(extracted.text, {
            subjectId: subjectMode,
            sourceName: item.file.name,
            existing: state.materials,
          });
          made.push({
            id: `batch-${Date.now()}-${index}`,
            name: item.file.name,
            mime: item.file.type || 'text/plain',
            bytes: item.file.size,
            analysis,
            warnings: extracted.warnings,
          });
        } catch (error) {
          failures.push(`${item.file.name}: ${error instanceof Error ? error.message : 'could not be read'}`);
        }
      }

      if (paste.trim().length > 20) {
        setBusy('Analysing pasted text…');
        const analysis = analyseMaterial(paste, {
          subjectId: subjectMode,
          sourceName: 'Pasted material',
          existing: state.materials,
        });
        made.push({
          id: `batch-paste-${Date.now()}`,
          name: 'Pasted material',
          mime: 'text/plain',
          bytes: paste.length,
          analysis,
          warnings: [],
        });
      }

      if (made.length === 0) {
        notify(failures[0] ?? 'Nothing to analyse — add a file or paste some text.');
        return;
      }

      // "Add material for this topic" from the Learn page: honour the topic.
      if (presetTopic && TOPIC_MAP[presetTopic]) {
        const next: Record<string, Override> = {};
        for (const batch of made) {
          for (const draft of batch.analysis.sections) {
            if (draft.matches.some((m) => m.topicId === presetTopic)) {
              next[draft.id] = { topicId: presetTopic, selected: !draft.duplicateOf };
            }
          }
        }
        setOverrides(next);
      } else {
        setOverrides({});
      }

      setBatches(made);
      setStep('review');
      if (failures.length > 0) notify(failures[0]);
    } finally {
      setBusy(null);
      setPending([]);
    }
  };

  const setOverride = (id: string, patch: Partial<Override>) => {
    setOverrides((cur) => {
      const base = drafts.find((entry) => entry.draft.id === id);
      const current: Override = cur[id] ?? {
        topicId: base?.draft.topicId ?? null,
        selected: base?.draft.selected ?? false,
      };
      return { ...cur, [id]: { ...current, ...patch } };
    });
  };

  const selectAll = (value: boolean) => {
    const next: Record<string, Override> = {};
    for (const { draft } of drafts) {
      next[draft.id] = {
        topicId: draft.topicId,
        selected: value ? Boolean(draft.topicId) && !draft.duplicateOf : false,
      };
    }
    setOverrides(next);
  };

  const commit = () => {
    if (selectedCount === 0) return;
    let next = state;
    let added = 0;
    let skipped = 0;
    for (const batch of batches) {
      const batchDrafts = drafts
        .filter((entry) => entry.batch.id === batch.id && entry.draft.selected && entry.draft.topicId)
        .map((entry) => entry.draft);
      if (batchDrafts.length === 0) continue;
      const result = addMaterial(next, batch.analysis, batchDrafts, {
        sourceName: batch.name,
        mime: batch.mime,
        bytes: batch.bytes,
      });
      next = result.state;
      added += result.added.length;
      skipped += result.skipped;
    }
    set(() => next);
    setBatches([]);
    setOverrides({});
    setPaste('');
    setStep('input');
    setDone({ added, skipped });
    notify(`${added} block${added === 1 ? '' : 's'} added to your study material.`);
  };

  const reset = () => {
    setBatches([]);
    setOverrides({});
    setPaste('');
    setStep('input');
    setDone(null);
  };

  const browse = () => fileRef.current?.click();

  // ---------------------------------------------------------------- review view

  if (step === 'review') {
    return (
      <main className="page">
        <div className="page-head">
          <div className="col">
            <span className="stat-label">Material ingest · review before filing</span>
            <h1>{batches.length} document{batches.length === 1 ? '' : 's'} analysed</h1>
            <p>
              Every block below was matched against the official syllabus. Nothing is added until you press the button at
              the bottom — change a topic, deselect a block, or leave it out.
            </p>
          </div>
          <div className="page-actions">
            <button className="btn ghost" onClick={reset}>Start over</button>
            <button className="btn primary" onClick={commit} disabled={selectedCount === 0}>
              Add {selectedCount} block{selectedCount === 1 ? '' : 's'}
            </button>
          </div>
        </div>

        <div className="grid g4" style={{ marginBottom: 14 }}>
          <Card className="tight">
            <span className="stat-label">Blocks found</span>
            <div className="stat-value mono">{drafts.length}</div>
            <span className="stat-sub">{drafts.reduce((n, d) => n + d.draft.words, 0).toLocaleString()} words</span>
          </Card>
          <Card className="tight">
            <span className="stat-label">Topics touched</span>
            <div className="stat-value mono">{topicsTouched}</div>
            <span className="stat-sub">of 172 syllabus topics</span>
          </Card>
          <Card className="tight">
            <span className="stat-label">Needs a look</span>
            <div className="stat-value mono">{needsReview}</div>
            <span className="stat-sub">low confidence or unmatched</span>
          </Card>
          <Card className="tight">
            <span className="stat-label">Duplicates skipped</span>
            <div className="stat-value mono">{drafts.filter((d) => d.draft.duplicateOf).length}</div>
            <span className="stat-sub">already in your library</span>
          </Card>
        </div>

        {batches.some((b) => b.warnings.length > 0) && (
          <Card className="tight" style={{ marginBottom: 14 }}>
            {batches.flatMap((batch) =>
              batch.warnings.map((warning) => (
                <div key={`${batch.id}-${warning}`} className="row" style={{ gap: 8 }}>
                  <span className="dot warn" />
                  <span className="small">{batch.name}: {warning}</span>
                </div>
              )),
            )}
          </Card>
        )}

        {drafts.some((d) => d.draft.duplicateOf) && (
          <Card className="tight" style={{ marginBottom: 14 }}>
            <div className="row" style={{ gap: 8 }}>
              <span className="dot em" />
              <span className="small muted">
                {drafts.filter((d) => d.draft.duplicateOf).length} block(s) are already in your study material and were
                deselected automatically. They are listed at the bottom for reference.
              </span>
            </div>
          </Card>
        )}

        <Card className="tight" style={{ marginBottom: 14 }}>
          <div className="row wrap" style={{ gap: 8 }}>
            <input
              type="text"
              placeholder="Search the analysed text…"
              value={reviewQuery}
              onChange={(e) => setReviewQuery(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
              aria-label="Search analysed blocks"
            />
            <button className="btn ghost sm" onClick={() => setOnlyUnmatched((v) => !v)}>
              {onlyUnmatched ? 'Showing: needs a look' : 'Only needs a look'}
            </button>
            <button className="btn ghost sm" onClick={() => selectAll(true)}>Select all</button>
            <button className="btn ghost sm" onClick={() => selectAll(false)}>Deselect all</button>
          </div>
          <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
            <button className={`chip ${filter === 'all' ? '' : ''}`} onClick={() => setFilter('all')} style={{ cursor: 'pointer' }}>
              All subjects
            </button>
            {SUBJECTS.map((s) => (
              <button
                key={s.id}
                className="chip"
                onClick={() => setFilter(s.id)}
                style={{ cursor: 'pointer', opacity: filter === s.id ? 1 : 0.6 }}
              >
                {s.code}
              </button>
            ))}
          </div>
        </Card>

        {grouped.length === 0 && <Empty>No blocks match this filter.</Empty>}

        {grouped.map(([topicId, entries]) => {
          const topic = topicId && topicId !== '__dup' ? TOPIC_MAP[topicId] : null;
          const unit = topic ? unitOf(topic.unitId) : undefined;
          const subject = topic ? SUBJECTS.find((s) => s.id === topic.subjectId) : undefined;
          const duplicatesOnly = topicId === '__dup';
          const averageConfidence = Math.round(
            entries.reduce((n, e) => n + e.draft.confidence, 0) / Math.max(1, entries.length),
          );
          return (
            <Card key={topicId ?? 'unmatched'} className="tight" style={{ marginBottom: 12 }}>
              <CardHead
                title={duplicatesOnly ? 'Already in your library' : topic ? topic.name : 'Not linked to a topic'}
                sub={
                  duplicatesOnly
                    ? 'Skipped automatically'
                    : topic
                      ? `${subject?.code} · Unit ${unit?.order}: ${unit?.name} · ${entries.length} block${entries.length === 1 ? '' : 's'}`
                      : 'Pick a topic, or leave these out'
                }
                right={
                  !duplicatesOnly && (
                    <span className={`confidence ${confidenceTone(averageConfidence)}`}>{averageConfidence}% avg</span>
                  )
                }
              />
              {topic && <Bar percent={averageConfidence} tone={averageConfidence >= AUTO_ACCEPT_CONFIDENCE ? 'em' : ''} />}
              <div className="col" style={{ gap: 8, marginTop: 10 }}>
                {entries.map(({ draft }) => (
                  <div key={draft.id} className="mat-row">
                    <div className="row between" style={{ gap: 8 }}>
                      <div className="row" style={{ gap: 8, minWidth: 0 }}>
                        <input
                          type="checkbox"
                          checked={draft.selected}
                          disabled={Boolean(draft.duplicateOf)}
                          onChange={(e) => setOverride(draft.id, { selected: e.target.checked })}
                          aria-label={`Include "${draft.heading}"`}
                        />
                        <span className={`badge ${kindClass(draft.kind)}`}>{MATERIAL_KIND_LABELS[draft.kind]}</span>
                        <b className="small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {draft.heading}
                        </b>
                      </div>
                      <div className="row" style={{ gap: 6 }}>
                        <span className="tiny muted">{draft.words}w</span>
                        {!draft.duplicateOf && (
                          <span className={`confidence ${confidenceTone(draft.confidence)}`}>{draft.confidence}%</span>
                        )}
                      </div>
                    </div>

                    <p className="small muted" style={{ marginTop: 4 }}>{draft.summary}</p>

                    <div className="row wrap" style={{ gap: 6, marginTop: 6 }}>
                      {draft.keyTerms.slice(0, 6).map((term) => (
                        <span key={term} className="chip tiny">{term}</span>
                      ))}
                      {draft.matches[0]?.signals.slice(0, 2).map((signal) => (
                        <span key={signal} className="tiny muted">· {signal}</span>
                      ))}
                    </div>

                    <div className="row wrap" style={{ gap: 8, marginTop: 8 }}>
                      <select
                        value={draft.topicId ?? ''}
                        onChange={(e) => {
                          const value = e.target.value || null;
                          setOverride(draft.id, { topicId: value, selected: value ? true : false });
                        }}
                        aria-label="File under topic"
                        style={{ maxWidth: 320 }}
                      >
                        <option value="">— not linked —</option>
                        {topicOptions}
                      </select>
                      {draft.matches[0] && !draft.topicId && (
                        <button
                          className="btn ghost sm"
                          onClick={() => setOverride(draft.id, { topicId: draft.matches[0].topicId, selected: true })}
                        >
                          Accept suggestion · {TOPIC_MAP[draft.matches[0].topicId]?.name}
                        </button>
                      )}
                      <details style={{ width: '100%' }}>
                        <summary className="tiny muted" style={{ cursor: 'pointer' }}>Full text & alternatives</summary>
                        {draft.matches.length > 1 && (
                          <div className="row wrap" style={{ gap: 6, margin: '6px 0' }}>
                            {draft.matches.slice(1).map((match) => (
                              <button
                                key={match.topicId}
                                className="btn ghost sm"
                                onClick={() => setOverride(draft.id, { topicId: match.topicId, selected: true })}
                              >
                                {TOPIC_MAP[match.topicId]?.name} · {match.confidence}%
                              </button>
                            ))}
                          </div>
                        )}
                        <pre className="mat-body">{draft.body.slice(0, 4000)}</pre>
                      </details>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}

        <div className="sticky-actions">
          <span className="small muted">
            {selectedCount} of {drafts.length} blocks selected · nothing is saved until you confirm
          </span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn ghost" onClick={reset}>Cancel</button>
            <button className="btn primary" onClick={commit} disabled={selectedCount === 0}>
              Add {selectedCount} block{selectedCount === 1 ? '' : 's'} to study material
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------------- input view

  return (
    <main className="page">
      <div className="page-head">
        <div className="col">
          <span className="stat-label">Study material</span>
          <h1>Add material</h1>
          <p>
            Drop in your notes, a lecture PDF, a chapter exported as text or a past paper. EXAMFORGE reads it, splits it
            into blocks, works out which syllabus topic each block belongs to, and files it there. You review everything
            before it is saved.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn ghost" onClick={() => navigate('/learn' + (presetTopic ? `?topic=${presetTopic}` : ''))}>
            Open Learn
          </button>
          <button className="btn primary" onClick={runAnalysis} disabled={busy !== null || (pending.length === 0 && paste.trim().length < 20)}>
            {busy ?? 'Analyse material'}
          </button>
        </div>
      </div>

      {done && (
        <Card className="tight" style={{ marginBottom: 14, borderColor: '#2f4a3f' }}>
          <div className="row between" style={{ gap: 10 }}>
            <div className="row" style={{ gap: 8 }}>
              <span className="dot em" />
              <div className="col" style={{ gap: 0 }}>
                <b>{done.added} block{done.added === 1 ? '' : 's'} added to your study material</b>
                <span className="small muted">
                  {done.skipped > 0 ? `${done.skipped} skipped (duplicates or unassigned). ` : ''}
                  It now appears on the Learn page for each topic.
                </span>
              </div>
            </div>
            <button className="btn ghost sm" onClick={() => setDone(null)}>Dismiss</button>
          </div>
        </Card>
      )}

      <div className="grid ingest-grid">
        <div className="col" style={{ gap: 14 }}>
          <Card>
            <CardHead title="Import a document" sub="PDF, text, Markdown, CSV, JSON or HTML · read in your browser, never uploaded" />
            <div
              className={`dropzone ${dragging ? 'drag' : ''}`}
              role="button"
              tabIndex={0}
              aria-label="Drop files here or press Enter to browse"
              onClick={browse}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') browse();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
              }}
            >
              <span className="dropzone-ico">⇪</span>
              <b>Drop files here</b>
              <span className="small muted">or click to browse — {ACCEPTED_EXTENSIONS.join(' · ')}</span>
              <span className="tiny muted">Multiple files welcome. Scanned PDFs without a text layer need OCR first.</span>
            </div>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={ACCEPTED_EXTENSIONS.join(',')}
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = '';
              }}
            />

            {pending.length > 0 && (
              <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
                {pending.map((item, index) => (
                  <span key={`${item.file.name}-${index}`} className="file-chip">
                    <span>{item.file.name}</span>
                    <small>{formatBytes(item.file.size)}</small>
                    <button
                      aria-label={`Remove ${item.file.name}`}
                      onClick={() => setPending((cur) => cur.filter((_, i) => i !== index))}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="divider" />

            <Field label="Or paste the text directly">
              <textarea
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder="Paste a chapter, lecture notes, or a set of definitions. Headings are detected automatically."
                rows={8}
                style={{ resize: 'vertical' }}
              />
            </Field>

            <div className="row wrap" style={{ gap: 10, marginTop: 10 }}>
              <Field label="Subject">
                <select
                  value={subjectMode}
                  onChange={(e) => setSubjectMode(e.target.value as 'auto' | SubjectId)}
                  style={{ minWidth: 220 }}
                >
                  {SUBJECT_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <div className="col" style={{ justifyContent: 'flex-end', gap: 4 }}>
                <span className="tiny muted" style={{ maxWidth: 300 }}>
                  {presetTopic && TOPIC_MAP[presetTopic]
                    ? `Blocks matching "${TOPIC_MAP[presetTopic].name}" will be pre-selected for that topic.`
                    : 'Auto-detect scores the text against all 172 topics and picks the strongest subject.'}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHead
              title="Your study material"
              sub={`${summary.attachments} blocks · ${summary.topics} topics · ${summary.words.toLocaleString()} words`}
              right={
                <input
                  type="text"
                  placeholder="Search material…"
                  value={libraryQuery}
                  onChange={(e) => setLibraryQuery(e.target.value)}
                  style={{ width: 200 }}
                  aria-label="Search study material"
                />
              }
            />
            {state.materials.length === 0 ? (
              <Empty>No material yet. Import a document above and it will be filed under the matching topics.</Empty>
            ) : (
              <>
                <div className="row wrap" style={{ gap: 6, marginBottom: 8 }}>
                  {(Object.keys(summary.kinds) as MaterialSectionKind[])
                    .filter((kind) => summary.kinds[kind] > 0)
                    .map((kind) => (
                      <span key={kind} className={`badge ${kindClass(kind)}`}>
                        {MATERIAL_KIND_LABELS[kind]} · {summary.kinds[kind]}
                      </span>
                    ))}
                </div>
                <div className="col" style={{ gap: 6 }}>
                  {libraryHits.length === 0 && <Empty>Nothing matches that search.</Empty>}
                  {libraryHits.map((item) => {
                    const topic = TOPIC_MAP[item.topicId];
                    return (
                      <div key={item.id} className="mat-row">
                        <div className="row between" style={{ gap: 8 }}>
                          <div className="col" style={{ gap: 0, minWidth: 0 }}>
                            <b className="small">{item.title}</b>
                            <span className="tiny muted">
                              {topic?.name} · {item.sourceName} · {prettyDate(new Date(item.addedAt).toISOString().slice(0, 10))}
                            </span>
                          </div>
                          <div className="row" style={{ gap: 6 }}>
                            <span className={`badge ${kindClass(item.kind)}`}>{MATERIAL_KIND_LABELS[item.kind]}</span>
                            <button
                              className="btn danger sm"
                              onClick={() => {
                                set((cur) => removeMaterial(cur, item.id));
                                notify('Material removed.');
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <p className="small muted" style={{ marginTop: 4 }}>{item.summary}</p>
                      </div>
                    );
                  })}
                </div>

                {state.materialSources.length > 0 && (
                  <>
                    <div className="divider" />
                    <span className="stat-label">Sources</span>
                    <div className="col" style={{ gap: 4, marginTop: 6 }}>
                      {state.materialSources.map((source) => (
                        <div key={source.id} className="row between" style={{ gap: 8 }}>
                          <span className="small">
                            {source.name}{' '}
                            <span className="tiny muted">
                              · {source.attached} block{source.attached === 1 ? '' : 's'} · {formatBytes(source.bytes)} · {source.subjectId === 'auto' ? 'auto-detected' : SUBJECTS.find((s) => s.id === source.subjectId)?.code}
                            </span>
                          </span>
                          <button
                            className="btn ghost sm"
                            onClick={() => {
                              set((cur) => removeMaterialSource(cur, source.id));
                              notify(`Removed "${source.name}" and its ${source.attached} blocks.`);
                            }}
                          >
                            Delete source
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </Card>
        </div>

        <div className="col" style={{ gap: 14 }}>
          <Card>
            <CardHead title="How it works" sub="Four deterministic steps, no model calls" />
            <ol className="small" style={{ margin: 0, paddingLeft: 18, color: '#cfc9bf', lineHeight: 1.7 }}>
              <li><b>Extract</b> — PDF text layer or plain text, cleaned of page furniture and hyphen breaks.</li>
              <li><b>Split</b> — headings and paragraphs become blocks; oversized blocks are chunked.</li>
              <li><b>Match</b> — each block is scored against topic titles, subtopics and weighted terms.</li>
              <li><b>File</b> — you review assignments and confidence, then it is attached to the topic.</li>
            </ol>
          </Card>

          <Card>
            <CardHead title="Library" sub="Everything stays in this browser" />
            <div className="grid g2" style={{ gap: 10 }}>
              <div className="col" style={{ gap: 0 }}>
                <span className="stat-label">Sources</span>
                <span className="stat-value mono">{summary.sources}</span>
              </div>
              <div className="col" style={{ gap: 0 }}>
                <span className="stat-label">Blocks</span>
                <span className="stat-value mono">{summary.attachments}</span>
              </div>
              <div className="col" style={{ gap: 0 }}>
                <span className="stat-label">Topics covered</span>
                <span className="stat-value mono">{summary.topics}</span>
              </div>
              <div className="col" style={{ gap: 0 }}>
                <span className="stat-label">Words</span>
                <span className="stat-value mono">{summary.words.toLocaleString()}</span>
              </div>
            </div>
            <div className="divider" />
            <p className="tiny muted">
              Adding material never changes a topic to LEARNED or MASTERED. Coverage is not mastery — reading your
              material counts as study time, and only a passed assessment can master a topic.
            </p>
          </Card>

          <Card>
            <CardHead title="Tips for a clean import" />
            <ul className="small" style={{ margin: 0, paddingLeft: 18, color: '#cfc9bf' }}>
              <li>Pick the subject when you import a single subject's notes — matching becomes much sharper.</li>
              <li>Keep the syllabus topic name as a heading; it makes the assignment obvious.</li>
              <li>Scanned PDFs need OCR: if the analysis finds nothing, paste the text instead.</li>
              <li>Importing the same file twice is safe — duplicates are detected and skipped.</li>
            </ul>
          </Card>
        </div>
      </div>
    </main>
  );
}
