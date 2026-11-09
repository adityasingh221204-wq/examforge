// EXAMFORGE — Study Book: one continuous, printable, offline-readable book per subject.
// Built for the train: no clicking through levels, no network needed once the app has
// been opened online, and a saved reading position so you resume where you stopped.

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../state/store';
import { SUBJECTS } from '../data/syllabus';
import { bookFor, sectionNumber } from '../engine/book';
import { bookBodyMarkup, bookFileHtml, downloadFile } from '../engine/bookFile';
import { ensureRevision } from '../engine/revision';
import { getStatus, markLearned } from '../engine/progress';
import { prettyDate } from '../engine/dates';
import { Diagram } from '../components/diagram';
import { Empty, StatusBadge } from '../components/ui';
import type { SubjectId, TopicContent } from '../data/types';

const SHORT: Record<SubjectId, string> = {
  dl: 'Deep Learning',
  cn: 'Computer Networks',
  nlp: 'NLP',
  cloud: 'Cloud Computing',
};

const RESUME_KEY = 'examforge.book.position.v1';

type OfflineState = 'checking' | 'cached' | 'online-only';

export function Book() {
  const { state, set, notify } = useStore();
  const [params, setParams] = useSearchParams();
  const subjectId = (params.get('subject') as SubjectId | null) ?? 'dl';
  const unitFilter = params.get('unit') ?? '';
  const subject = SUBJECTS.find((s) => s.id === subjectId) ?? SUBJECTS[0];
  const book = useMemo(() => bookFor(subject.id, unitFilter || undefined), [subject.id, unitFilter]);
  const [progress, setProgress] = useState(0);
  const [offline, setOffline] = useState<OfflineState>('checking');
  const [restored, setRestored] = useState<{ id: string; name: string } | null>(null);

  // ---- reading progress bar
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [subject.id, unitFilter]);

  // ---- resume where the last session stopped
  useEffect(() => {
    if (unitFilter) return;
    let saved: { subjectId?: string; topicId?: string } | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(RESUME_KEY) ?? 'null');
    } catch {
      saved = null;
    }
    if (!saved || saved.subjectId !== subject.id || !saved.topicId) return;
    const target = saved.topicId;
    const timer = window.setTimeout(() => {
      const el = document.getElementById(target);
      if (el) {
        el.scrollIntoView({ block: 'start' });
        setRestored({ id: target, name: el.querySelector('h3')?.textContent ?? 'your last section' });
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, [subject.id, unitFilter]);

  // ---- remember the section being read
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-book-topic]'));
    if (nodes.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          try {
            localStorage.setItem(RESUME_KEY, JSON.stringify({ subjectId: subject.id, topicId: entry.target.id }));
          } catch {
            /* private mode — resume is a nicety, not a requirement */
          }
        }
      },
      { rootMargin: '-15% 0px -70% 0px' },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [subject.id, unitFilter]);

  // ---- is this build actually cached for offline use? Only claim it when assets are stored.
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('caches' in window)) {
      setOffline('online-only');
      return;
    }
    let cancelled = false;
    const sync = async () => {
      let cached = false;
      try {
        for (const key of await caches.keys()) {
          const cache = await caches.open(key);
          if ((await cache.keys()).length > 1) cached = true; // shell + at least one asset
        }
      } catch {
        cached = false;
      }
      if (!cancelled) setOffline(cached ? 'cached' : 'online-only');
    };
    void sync();
    navigator.serviceWorker.ready.then(sync).catch(() => undefined);
    navigator.serviceWorker.addEventListener('controllerchange', sync);
    const timer = window.setInterval(sync, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      navigator.serviceWorker.removeEventListener('controllerchange', sync);
    };
  }, []);

  const chooseSubject = (id: SubjectId) => {
    setRestored(null);
    setParams({ subject: id }, { replace: true });
    window.scrollTo({ top: 0 });
  };

  const chooseUnit = (id: string) => {
    setRestored(null);
    setParams(id ? { subject: subject.id, unit: id } : { subject: subject.id }, { replace: true });
    window.scrollTo({ top: 0 });
  };

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const saveFile = () => {
    const html = bookFileHtml({
      title: `${subject.code} — ${subject.name}`,
      kicker: 'EXAMFORGE study book',
      subtitle: `${book.topics} topics in ${book.chapters.length} chapters · paper on ${prettyDate(subject.examDate)} · ${book.words.toLocaleString()} words`,
      bodyHtml: bookBodyMarkup(document),
    });
    downloadFile(`examforge-${subject.code}-study-book.html`, html);
    notify('Book saved as a single HTML file — open it anywhere, no internet needed.');
  };

  const learn = (topicId: string) => {
    set((cur) => ensureRevision(markLearned(cur, [topicId]), topicId));
    notify('Marked learned and scheduled revision. The book keeps your place.');
  };

  return (
    <main className="page book-page">
      <div className="page-head">
        <div className="col">
          <span className="stat-label">Offline study book · read straight through</span>
          <h1>
            {subject.code} · {subject.name}
          </h1>
          <p>
            {book.chapters.length} chapter{book.chapters.length === 1 ? '' : 's'} · {book.topics} topics · about{' '}
            {book.minutes} minutes of reading · paper on {prettyDate(subject.examDate)}. Written in syllabus order so you can
            start at the top and keep going.
          </p>
        </div>
        <div className="page-actions">
          <span className={`badge ${offline === 'cached' ? 'learned' : offline === 'checking' ? 'in_progress' : 'needs_revision'}`}>
            {offline === 'cached'
              ? 'Available offline'
              : offline === 'checking'
                ? 'Checking offline cache…'
                : 'Save the book file for offline'}
          </span>
          <select value={unitFilter} onChange={(e) => chooseUnit(e.target.value)} aria-label="Chapter range">
            <option value="">Whole book</option>
            {subject.units.map((u) => (
              <option key={u.id} value={u.id}>
                Chapter {u.order}: {u.name}
              </option>
            ))}
          </select>
          <button className="btn primary" onClick={saveFile}>
            Save book file
          </button>
          <button className="btn ghost" onClick={() => window.print()}>
            Print / save as PDF
          </button>
        </div>
      </div>

      <div className="book-tabs" role="group" aria-label="Choose book">
        {SUBJECTS.map((s) => (
          <button
            key={s.id}
            className={`btn ghost sm ${s.id === subject.id ? 'on' : ''}`}
            aria-pressed={s.id === subject.id}
            onClick={() => chooseSubject(s.id)}
          >
            {SHORT[s.id]}
          </button>
        ))}
      </div>

      <div className="book-progress" aria-hidden>
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="book-layout">
        <div className="book-body">
          {restored && (
            <div className="book-note row between">
              <span>Resumed at “{restored.name}”.</span>
              <button className="btn ghost sm" onClick={() => jump(restored.id)}>
                Back to it
              </button>
            </div>
          )}

          {book.chapters.map((chapter) => (
            <section key={chapter.unit.id} id={chapter.unit.id} className="book-chapter">
              <header className="book-chapter-head">
                <span className="stat-label">
                  Chapter {chapter.index} · Unit {chapter.unit.order}
                </span>
                <h2>{chapter.unit.name}</h2>
                <p className="book-sub">
                  {chapter.entries.length} topics · {chapter.unit.hours} syllabus hours · about {chapter.minutes} min read
                </p>
              </header>

              {chapter.entries.map((entry, i) => {
                const status = getStatus(state, entry.topic.id);
                const open = status === 'not_started' || status === 'in_progress';
                return (
                  <article key={entry.topic.id} id={entry.topic.id} data-book-topic className="book-topic">
                    <div className="book-topic-head">
                      <span className="book-num">{sectionNumber(chapter.index, i)}</span>
                      <h3>{entry.topic.name}</h3>
                      <div className="book-topic-actions">
                        <StatusBadge status={status} />
                        {open && (
                          <button className="btn ghost sm" onClick={() => learn(entry.topic.id)}>
                            Mark learned
                          </button>
                        )}
                      </div>
                    </div>

                    {entry.topic.subtopics.length > 0 && (
                      <p className="book-terms-line">{entry.topic.subtopics.join(' · ')}</p>
                    )}

                    {entry.content ? <Prose content={entry.content} /> : (
                      <Empty>
                        No authored text for this topic yet. The syllabus outline above is the official scope — use Learn for the
                        five levels once content is added.
                      </Empty>
                    )}
                  </article>
                );
              })}
            </section>
          ))}
        </div>

        <aside className="book-toc" aria-label="Book contents">
          <div className="stat-label">Contents</div>
          {book.chapters.map((chapter) => (
            <div key={chapter.unit.id} className="book-toc-group">
              <button className="book-toc-unit" onClick={() => jump(chapter.unit.id)}>
                {chapter.index}. {chapter.unit.name}
              </button>
              {chapter.entries.map((entry, i) => (
                <button key={entry.topic.id} className="book-toc-topic" onClick={() => jump(entry.topic.id)}>
                  <span className="book-toc-num">{sectionNumber(chapter.index, i)}</span>
                  {entry.topic.name}
                </button>
              ))}
            </div>
          ))}
          <p className="tiny muted book-toc-foot">
            {book.words.toLocaleString()} words. For the train, use <b>Save book file</b> — one HTML file you can open with
            no signal at all.
          </p>
        </aside>
      </div>
    </main>
  );
}

function Prose({ content }: { content: TopicContent }) {
  const tech = content.tech;
  return (
    <div className="prose book-prose">
      <p className="book-lead">{content.zero.what}</p>

      <h4>Why it exists</h4>
      <p>{content.zero.why}</p>

      <h4>The problem it solves</h4>
      <p>{content.zero.problem}</p>

      <h4>How it works</h4>
      <p>{content.zero.how}</p>
      <p>{tech.architecture}</p>

      <h4>Formal definition</h4>
      <p>{tech.definition}</p>

      {tech.components.length > 0 && (
        <>
          <h4>Building blocks</h4>
          <ul>
            {tech.components.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </>
      )}

      {tech.math && (
        <>
          <h4>Under the hood</h4>
          <div className="formula">{tech.math}</div>
        </>
      )}

      {content.formulas && content.formulas.length > 0 && (
        <>
          <h4>Formulas</h4>
          {content.formulas.map((f) => (
            <div key={f.name} className="formula">
              {f.expr}
              <small>
                {f.name} — {f.when}
              </small>
            </div>
          ))}
        </>
      )}

      {content.diagram && (
        <>
          <h4>Diagram</h4>
          <Diagram spec={content.diagram} />
        </>
      )}

      {content.comparison && (
        <>
          <h4>{content.comparison.title}</h4>
          <table>
            <thead>
              <tr>
                <th />
                {content.comparison.columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {content.comparison.rows.map((r) => (
                <tr key={r.label}>
                  <td>
                    <b>{r.label}</b>
                  </td>
                  {r.cells.map((cell, i) => (
                    <td key={i}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {content.examples.length > 0 && (
        <>
          <h4>Worked example</h4>
          <p>{content.examples[0]}</p>
          {content.examples.length > 1 && (
            <ul>
              {content.examples.slice(1).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </>
      )}

      {content.applications.length > 0 && (
        <>
          <h4>Where it is used</h4>
          <ul>
            {content.applications.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </>
      )}

      {(tech.advantages.length > 0 || tech.disadvantages.length > 0) && (
        <>
          <h4>Strengths and limits</h4>
          <ul>
            {tech.advantages.map((a) => (
              <li key={a}>+ {a}</li>
            ))}
            {[...tech.disadvantages, ...(tech.limitations ?? [])].map((d) => (
              <li key={d}>− {d}</li>
            ))}
          </ul>
        </>
      )}

      <h4>For the paper</h4>
      <p className="muted">{content.zero.where}</p>

      {content.definitions.length > 0 && (
        <>
          <h4>Exam vocabulary</h4>
          <table>
            <tbody>
              {content.definitions.map((d) => (
                <tr key={d.term}>
                  <td style={{ width: '32%' }}>
                    <b>{d.term}</b>
                  </td>
                  <td>{d.def}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
