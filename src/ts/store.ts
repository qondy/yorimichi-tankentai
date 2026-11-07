import {
  collection, doc, onSnapshot, setDoc, addDoc, deleteDoc, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { Assessment, Chance, ChanceKind, Choice, Feel, OpenSlot, PowerKey, Practice, SlotPart, SlotResult, Stage } from './types';
import { POWER_KEYS } from './options';

const FEELS: Feel[] = ['good', 'soso', 'hard'];
const KINDS: ChanceKind[] = ['meet', 'invite', 'request', 'info', 'idea', 'other'];
const CHOICES: Choice[] = ['go', 'hold', 'pass'];
const STAGES: Stage[] = ['seed', 'sprout', 'flower', 'fruit'];
const SLOT_PARTS: SlotPart[] = ['am', 'pm', 'eve'];
const SLOT_RESULTS: SlotResult[] = ['chance', 'rest', 'filled'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const millis = (v: unknown): number =>
  (v && typeof (v as { toMillis?: unknown }).toMillis === 'function'
    ? (v as { toMillis: () => number }).toMillis() : Date.now());
const pick = <T extends string>(v: unknown, list: T[], fallback: T): T =>
  (list.includes(v as T) ? v as T : fallback);

const chancesCol = (uid: string) => collection(db, 'users', uid, 'chances');
const chanceDoc = (uid: string, id: string) => doc(db, 'users', uid, 'chances', id);
const practicesCol = (uid: string) => collection(db, 'users', uid, 'practices');
const practiceDoc = (uid: string, id: string) => doc(db, 'users', uid, 'practices', id);
const assessmentsCol = (uid: string) => collection(db, 'users', uid, 'assessments');
const assessmentDoc = (uid: string, month: string) => doc(db, 'users', uid, 'assessments', month);
const slotsCol = (uid: string) => collection(db, 'users', uid, 'openSlots');
const slotDoc = (uid: string, week: string) => doc(db, 'users', uid, 'openSlots', week);

export function subscribeChances(
  uid: string,
  onData: (items: Chance[]) => void,
  onError: (err: Error) => void,
): () => void {
  return onSnapshot(chancesCol(uid), (snap) => {
    const list: Chance[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (typeof data.date !== 'string' || !DATE_RE.test(data.date) || !str(data.title).trim()) return;
      const holdUntil = str(data.holdUntil);
      list.push({
        id: d.id,
        date: data.date,
        kind: pick(data.kind, KINDS, 'other'),
        title: str(data.title),
        choice: pick(data.choice, CHOICES, 'hold'),
        holdUntil: DATE_RE.test(holdUntil) ? holdUntil : '',
        stage: pick(data.stage, STAGES, 'seed'),
        powers: Array.isArray(data.powers)
          ? (data.powers as unknown[]).filter((p): p is PowerKey => POWER_KEYS.includes(p as PowerKey))
          : [],
        note: str(data.note),
        story: str(data.story),
        createdAt: millis(data.createdAt),
      });
    });
    list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
    onData(list);
  }, onError);
}

export function subscribePractices(
  uid: string,
  onData: (items: Practice[]) => void,
  onError: (err: Error) => void,
): () => void {
  return onSnapshot(practicesCol(uid), (snap) => {
    const list: Practice[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (!POWER_KEYS.includes(data.power) || typeof data.date !== 'string' || !DATE_RE.test(data.date)) return;
      list.push({
        id: d.id,
        power: data.power,
        date: data.date,
        drill: str(data.drill),
        result: str(data.result),
        feel: pick(data.feel, FEELS, 'soso'),
        insight: str(data.insight),
        createdAt: millis(data.createdAt),
      });
    });
    list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
    onData(list);
  }, onError);
}

export function subscribeAssessments(
  uid: string,
  onData: (items: Assessment[]) => void,
  onError: (err: Error) => void,
): () => void {
  return onSnapshot(assessmentsCol(uid), (snap) => {
    const list: Assessment[] = [];
    snap.forEach((d) => {
      if (!MONTH_RE.test(d.id)) return;
      const data = d.data();
      const raw = (data.scores && typeof data.scores === 'object') ? data.scores as Record<string, unknown> : {};
      const scores = {} as Record<PowerKey, number>;
      POWER_KEYS.forEach((k) => {
        const v = Number(raw[k]);
        scores[k] = Number.isInteger(v) && v >= 1 && v <= 5 ? v : 1;
      });
      list.push({ month: d.id, scores, memo: str(data.memo) });
    });
    list.sort((a, b) => a.month.localeCompare(b.month));
    onData(list);
  }, onError);
}

export function subscribeOpenSlots(
  uid: string,
  onData: (items: OpenSlot[]) => void,
  onError: (err: Error) => void,
): () => void {
  return onSnapshot(slotsCol(uid), (snap) => {
    const list: OpenSlot[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (!DATE_RE.test(d.id) || typeof data.date !== 'string' || !DATE_RE.test(data.date)) return;
      list.push({
        week: d.id,
        date: data.date,
        part: pick(data.part, SLOT_PARTS, 'pm'),
        result: SLOT_RESULTS.includes(data.result) ? data.result : '',
      });
    });
    list.sort((a, b) => b.week.localeCompare(a.week));
    onData(list);
  }, onError);
}

export function saveOpenSlot(uid: string, slot: OpenSlot): Promise<void> {
  return setDoc(slotDoc(uid, slot.week), {
    date: slot.date,
    part: slot.part,
    result: '',
    updatedAt: serverTimestamp(),
  });
}

export function setSlotResult(uid: string, week: string, result: SlotResult): Promise<void> {
  return setDoc(slotDoc(uid, week), { result, updatedAt: serverTimestamp() }, { merge: true });
}

export function deleteOpenSlot(uid: string, week: string): Promise<void> {
  return deleteDoc(slotDoc(uid, week));
}

export interface HoldResetItem {
  id: string;
  /** go=寄ってみる / pass=見送る */
  choice: 'go' | 'pass';
}

/** 保留をまとめて整理する（記録は消さず、寄ってみる／見送るに振り分ける） */
export async function resetHolds(uid: string, items: HoldResetItem[]): Promise<void> {
  const BATCH_MAX = 400;
  for (let i = 0; i < items.length; i += BATCH_MAX) {
    const batch = writeBatch(db);
    items.slice(i, i + BATCH_MAX).forEach(({ id, choice }) => {
      batch.set(
        chanceDoc(uid, id),
        choice === 'go'
          ? { choice: 'go', stage: 'seed', holdUntil: '', updatedAt: serverTimestamp() }
          : { choice: 'pass', holdUntil: '', updatedAt: serverTimestamp() },
        { merge: true },
      );
    });
    await batch.commit();
  }
}

export type ChanceInput = Omit<Chance, 'id' | 'createdAt'>;
export type PracticeInput = Omit<Practice, 'id' | 'createdAt'>;

export async function createChance(uid: string, input: ChanceInput): Promise<void> {
  await addDoc(chancesCol(uid), { ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export function updateChance(uid: string, id: string, input: Partial<ChanceInput>): Promise<void> {
  return setDoc(chanceDoc(uid, id), { ...input, updatedAt: serverTimestamp() }, { merge: true });
}

export function deleteChance(uid: string, id: string): Promise<void> {
  return deleteDoc(chanceDoc(uid, id));
}

export async function createPractice(uid: string, input: PracticeInput): Promise<void> {
  await addDoc(practicesCol(uid), { ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export function updatePractice(uid: string, id: string, input: PracticeInput): Promise<void> {
  return setDoc(practiceDoc(uid, id), { ...input, updatedAt: serverTimestamp() }, { merge: true });
}

export function deletePractice(uid: string, id: string): Promise<void> {
  return deleteDoc(practiceDoc(uid, id));
}

export function saveAssessment(uid: string, a: Assessment): Promise<void> {
  return setDoc(assessmentDoc(uid, a.month), {
    scores: a.scores,
    memo: a.memo,
    updatedAt: serverTimestamp(),
  });
}
