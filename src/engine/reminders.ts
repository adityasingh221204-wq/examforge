// EXAMFORGE — local reminders.
// A static web app cannot wake itself the way a native alarm can, so these reminders fire
// while EXAMFORGE is open (installed or in a tab). Every reminder is de-duplicated per day.

import type { AppState, StudySession } from '../data/types';
import { SUBJECTS } from '../data/syllabus';
import { diffDays, prettyDateShort, timeToMin, toKey } from './dates';
import { PLAN_ID } from '../data/plan';

/** All plan times are IST (UTC+05:30); reminders must compare against the same clock. */
const IST_OFFSET_MIN = 330;

function istParts(now: Date): { date: string; minutes: number } {
  const shifted = new Date(now.getTime() + (IST_OFFSET_MIN + now.getTimezoneOffset()) * 60000);
  return { date: toKey(shifted), minutes: shifted.getHours() * 60 + shifted.getMinutes() };
}

export interface Reminder {
  /** stable key; the same key never fires twice */
  key: string;
  title: string;
  body: string;
  tone: 'revision' | 'exam' | 'overdue';
}

function planSessionsToday(state: AppState, today: string): StudySession[] {
  return state.sessions.filter((s) => s.planId === PLAN_ID && s.date === today);
}

/** The reminder that should be delivered right now, if any. */
export function currentReminder(state: AppState, now = new Date()): Reminder | null {
  const { date: today, minutes: nowMin } = istParts(now);

  // 1. overdue learning work — remind once, in the morning
  const overdue = state.sessions.filter((s) => s.missed && !s.done && s.date < today);
  if (overdue.length > 0 && nowMin >= timeToMin('08:00')) {
    return {
      key: `overdue:${today}`,
      title: `${overdue.length} unfinished session${overdue.length === 1 ? '' : 's'}`,
      body: 'Open the planner and redistribute the missed topics before they pile up.',
      tone: 'overdue',
    };
  }

  // 2. examination countdown — 24 hours and 3 hours before each paper
  for (const exam of SUBJECTS) {
    const days = diffDays(today, exam.examDate);
    if (days < 0) continue;
    const examStart = timeToMin(exam.examStart);
    const hoursToExam = days * 24 + (examStart - nowMin) / 60;
    if (hoursToExam <= 0) continue;
    // smallest lead window that already applies, so 24 h fires before the 3 h warning
    const lead = [...state.reminders.examLeadHours].sort((a, b) => a - b).find((l) => hoursToExam <= l);
    if (lead !== undefined) {
      const label = Math.max(1, Math.round(hoursToExam));
      return {
        key: `exam:${exam.id}:${lead}:${today}`,
        title: `${exam.name} paper in about ${label} hour${label === 1 ? '' : 's'}`,
        body: `${exam.code} · ${prettyDateShort(exam.examDate)} at ${exam.examStart}. Light revision only — no new topics.`,
        tone: 'exam',
      };
    }
  }

  // 3. daily revision reminder at the configured time
  if (nowMin >= timeToMin(state.reminders.dailyTime)) {
    const todays = planSessionsToday(state, today);
    const revisionLeft = todays.filter((s) => !s.done && (s.kind === 'revision' || s.kind === 'practice'));
    if (revisionLeft.length > 0) {
      return {
        key: `revision:${today}`,
        title: 'Revision block is due',
        body: revisionLeft[0].title ?? 'Active recall session in the planner.',
        tone: 'revision',
      };
    }
  }

  return null;
}

/** Browser notifications are opt-in and only work while the app is open. */
export function canNotify(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!canNotify()) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

export function deliver(reminder: Reminder): boolean {
  if (!canNotify() || Notification.permission !== 'granted') return false;
  try {
    new Notification(reminder.title, { body: reminder.body, tag: reminder.key, icon: '/icon.svg' });
    return true;
  } catch {
    return false;
  }
}

export function reminderSupported(): boolean {
  return canNotify();
}
