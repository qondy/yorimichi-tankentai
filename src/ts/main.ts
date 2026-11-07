import { User } from 'firebase/auth';
import { onAuthChange, loginWithGoogle, logout } from './auth';
import { showToast, openOverlay, closeOverlay, textEl, button } from './ui';
import { submitFeedback } from './feedback';
import { todayKey, labelOf, monthKey, daysInMonth, addDays, parseKey, weekStart } from './dates';
import {
  POWERS, POWER_KEYS, KINDS, CHOICES, CHOICE_LABEL, STAGES, HOLD_DAYS, FEELS, FEEL_LABEL, SCORE_LEVELS,
  powerOf, kindLabel, stageIndex, practiceXp, chanceXp, XP_STAGE,
  SLOT_PARTS, SLOT_PART_LABEL, SLOT_RESULTS, SLOT_RESULT_LABEL,
} from './options';
import {
  subscribeChances, subscribePractices, subscribeAssessments,
  createChance, updateChance, deleteChance, createPractice, updatePractice, deletePractice,
  saveAssessment, ChanceInput, PracticeInput,
  subscribeOpenSlots, saveOpenSlot, setSlotResult, deleteOpenSlot, resetHolds, HoldResetItem,
} from './store';
import {
  totalXp, titleOf, powerStats, streak, countByDate, stageCounts, dueHolds, goRate,
  latestAssessment, weakFromPass, todayPower, drillIndex, pendingPastSlot, keptSlots,
} from './stats';
import { Assessment, Chance, ChanceKind, Choice, Feel, OpenSlot, PowerKey, Practice, SlotPart, Stage } from './types';
import { initClickTracking, track } from './analytics';

initClickTracking();

// ============================================================
// DOM refs
// ============================================================
const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const SVG_NS = 'http://www.w3.org/2000/svg';

const loginScreen = $('login-screen');
const appEl = $('app');
const userInfo = $('user-info');
const userAvatar = $<HTMLImageElement>('user-avatar');
const userName = $('user-name');
const btnGoogleLogin = $<HTMLButtonElement>('btn-google-login');
const btnLogout = $<HTMLButtonElement>('btn-logout');

const tabButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.tabs__btn'));
const panels = Array.from(document.querySelectorAll<HTMLElement>('.panel'));
const countDue = $('count-due');

const todayDateEl = $('today-date');
const todayGo = $('today-go');
const todayFruit = $('today-fruit');
const todayStreak = $('today-streak');
const slotSection = $('slot-section');
const slotList = $('slot-list');
const dueSection = $('due-section');
const dueList = $('due-list');
const assessReminder = $('assess-reminder');
const drillMark = $('drill-mark');
const drillSkill = $('drill-skill');
const drillReason = $('drill-reason');
const drillText = $('drill-text');
const drillTip = $('drill-tip');
const btnDrillDone = $<HTMLButtonElement>('btn-drill-done');
const btnDrillNext = $<HTMLButtonElement>('btn-drill-next');
const todayPowerChips = $('today-power-chips');
const todayList = $('today-list');

const inputSearch = $<HTMLInputElement>('input-search');
const logChips = $('log-chips');
const logList = $('log-list');
const resetReminder = $('reset-reminder');
const resetHoldCount = $('reset-hold-count');
const btnResetHolds = $<HTMLButtonElement>('btn-reset-holds');

const zukanList = $('zukan-list');

const statTitle = $('stat-title');
const statXp = $('stat-xp');
const statTitleFill = $('stat-title-fill');
const statNext = $('stat-next');
const statChances = $('stat-chances');
const statRate = $('stat-rate');
const statPractice = $('stat-practice');
const stageFunnel = $('stage-funnel');
const radarEl = $('radar');
const radarLegend = $('radar-legend');
const radarMemo = $('radar-memo');
const powerLevels = $('power-levels');
const passInsight = $('pass-insight');
const calTitle = $('cal-title');
const calendarEl = $('calendar');

const chanceOverlay = $('chance-modal-overlay');
const chanceForm = $<HTMLFormElement>('chance-form');
const chanceModalTitle = $('chance-modal-title');
const kindChips = $('kind-chips');
const inputTitle = $<HTMLTextAreaElement>('input-title');
const chancePast = $('chance-past');
const inputChanceDate = $<HTMLInputElement>('input-chance-date');
const choiceOptions = $('choice-options');
const holdField = $('hold-field');
const holdChips = $('hold-chips');
const inputHoldUntil = $<HTMLInputElement>('input-hold-until');
const stageField = $('stage-field');
const stageChips = $('stage-chips');
const storyField = $('story-field');
const inputStory = $<HTMLTextAreaElement>('input-story');
const powersLabel = $('powers-label');
const powerChips = $('power-chips');
const noteLabel = $('note-label');
const inputNote = $<HTMLTextAreaElement>('input-note');
const btnChanceSubmit = $<HTMLButtonElement>('btn-chance-submit');

const practiceOverlay = $('practice-modal-overlay');
const practiceForm = $<HTMLFormElement>('practice-form');
const practiceModalTitle = $('practice-modal-title');
const practicePowerChips = $('practice-power-chips');
const practiceDrill = $('practice-drill');
const inputDate = $<HTMLInputElement>('input-date');
const inputResult = $<HTMLTextAreaElement>('input-result');
const feelOptions = $('feel-options');
const inputInsight = $<HTMLTextAreaElement>('input-insight');
const btnPracticeSubmit = $<HTMLButtonElement>('btn-practice-submit');

const assessOverlay = $('assess-modal-overlay');
const assessForm = $<HTMLFormElement>('assess-form');
const assessModalTitle = $('assess-modal-title');
const scoreScale = $('score-scale');
const assessRows = $('assess-rows');
const inputAssessMemo = $<HTMLTextAreaElement>('input-assess-memo');
const btnAssessSubmit = $<HTMLButtonElement>('btn-assess-submit');

const resetOverlay = $('reset-modal-overlay');
const resetListEl = $('reset-list');
const resetSummary = $('reset-summary');
const btnResetSubmit = $<HTMLButtonElement>('btn-reset-submit');

const confirmOverlay = $('confirm-dialog-overlay');
const confirmTitle = $('confirm-dialog-title');
const confirmText = $('confirm-dialog-text');
const btnConfirmCancel = $<HTMLButtonElement>('btn-confirm-cancel');
const btnConfirmOk = $<HTMLButtonElement>('btn-confirm-ok');

const feedbackBtn = $<HTMLButtonElement>('feedback-btn');
const feedbackOverlay = $('feedback-modal-overlay');
const inputFeedbackMessage = $<HTMLTextAreaElement>('input-feedback-message');
const btnFeedbackClose = $<HTMLButtonElement>('btn-feedback-close');
const btnFeedbackSend = $<HTMLButtonElement>('btn-feedback-send');

// ============================================================
// State
// ============================================================
type Tab = 'today' | 'log' | 'zukan' | 'record';
type LogFilter = 'all' | Choice | 'fruit';
type ResetChoice = 'go' | 'pass' | 'keep';

interface State {
  uid: string | null;
  unsubscribers: (() => void)[];
  chances: Chance[];
  practices: Practice[];
  assessments: Assessment[];
  slots: OpenSlot[];
  slotsLoaded: boolean;
  loaded: boolean;
  tab: Tab;
  /** きょうのお題で、自分で選び直した力（null ならおすすめ） */
  pickedPower: PowerKey | null;
  drillOffset: number;
  logFilter: LogFilter;
  search: string;
  calYear: number;
  calMonth0: number;
  editingChanceId: string | null;
  formKind: ChanceKind;
  formChoice: Choice;
  formStage: Stage;
  formPowers: PowerKey[];
  editingPracticeId: string | null;
  formPower: PowerKey;
  formDrill: string;
  formFeel: Feel;
  assessScores: Record<PowerKey, number>;
  /** あき枠を決めるときの選択中の日・時間帯 */
  slotDate: string | null;
  slotPart: SlotPart;
  /** 保留リセットで選んだ振り分け（未選択は「見送る」） */
  resetChoices: Record<string, ResetChoice>;
  pending: Set<string>;
  confirmAction: (() => Promise<void>) | null;
}

const now = new Date();
const state: State = {
  uid: null,
  unsubscribers: [],
  chances: [],
  practices: [],
  assessments: [],
  slots: [],
  slotsLoaded: false,
  loaded: false,
  tab: 'today',
  pickedPower: null,
  drillOffset: 0,
  logFilter: 'all',
  search: '',
  calYear: now.getFullYear(),
  calMonth0: now.getMonth(),
  editingChanceId: null,
  formKind: 'meet',
  formChoice: 'go',
  formStage: 'seed',
  formPowers: [],
  editingPracticeId: null,
  formPower: POWERS[0].key,
  formDrill: '',
  formFeel: 'good',
  assessScores: {} as Record<PowerKey, number>,
  slotDate: null,
  slotPart: 'pm',
  resetChoices: {},
  pending: new Set(),
  confirmAction: null,
};

// ============================================================
// Helpers
// ============================================================
const findChance = (id: string | null): Chance | undefined =>
  (id ? state.chances.find((c) => c.id === id) : undefined);
const findPractice = (id: string | null): Practice | undefined =>
  (id ? state.practices.find((p) => p.id === id) : undefined);

const currentMonth = (): string => todayKey().slice(0, 7);

/** 同じキーの処理が進行中なら何もしない（二重送信防止） */
async function withLock(key: string, fn: () => Promise<void>, errorMessage = '保存に失敗しました。通信環境を確認してください'): Promise<boolean> {
  if (state.pending.has(key)) return false;
  state.pending.add(key);
  renderAll();
  try {
    await fn();
    return true;
  } catch (err) {
    console.error(err);
    showToast(errorMessage);
    return false;
  } finally {
    state.pending.delete(key);
    renderAll();
  }
}

function askConfirm(title: string, text: string, okLabel: string, action: () => Promise<void>): void {
  confirmTitle.textContent = title;
  confirmText.textContent = text;
  btnConfirmOk.textContent = okLabel;
  state.confirmAction = action;
  openOverlay(confirmOverlay);
}

function emptyState(text: string): HTMLElement {
  return textEl('p', 'empty-state', text);
}

function pill(text: string, className: string): HTMLElement {
  return textEl('span', className, text);
}

function radioChip(label: string, active: boolean, onClick: () => void): HTMLButtonElement {
  const b = button(label, `chip${active ? ' is-active' : ''}`, onClick);
  b.setAttribute('role', 'radio');
  b.setAttribute('aria-checked', String(active));
  return b;
}

function powerMarkEl(key: PowerKey, small = false): HTMLElement {
  return textEl('span', `skill-mark skill-mark--${key}${small ? ' skill-mark--sm' : ''}`, powerOf(key).mark);
}

function lineEl(label: string, text: string, className = ''): HTMLElement {
  const row = document.createElement('div');
  row.className = `practice__row${className ? ` ${className}` : ''}`;
  row.append(textEl('span', 'practice__label', label), textEl('p', 'practice__text', text));
  return row;
}

function actionBtn(key: string, label: string, className: string, fn: () => Promise<void>, done: string): HTMLButtonElement {
  const b = button(label, className, () => {
    void withLock(key, async () => {
      await fn();
      showToast(done);
    });
  });
  b.disabled = state.pending.has(key);
  return b;
}

// ============================================================
// 寄り道ログのカード
// ============================================================
function stageTrack(stage: Stage): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'stage-track';
  const cur = stageIndex(stage);
  STAGES.forEach((s, i) => {
    const step = textEl('span', `stage-track__step${i <= cur ? ' is-reached' : ''}${i === cur ? ' is-current' : ''}`, s.label);
    step.title = s.desc;
    wrap.appendChild(step);
  });
  return wrap;
}

function chanceCard(c: Chance): HTMLElement {
  const uid = state.uid;
  const card = document.createElement('article');
  card.className = `item-card chance chance--${c.choice}${c.choice === 'go' && c.stage === 'fruit' ? ' is-fruit' : ''}`;
  const head = document.createElement('div');
  head.className = 'item-card__head';
  head.append(
    pill(kindLabel(c.kind), 'item-card__badge'),
    pill(CHOICE_LABEL[c.choice], `choice-pill choice-pill--${c.choice}`),
    pill(`+${chanceXp(c)}XP`, 'xp-pill'),
  );
  card.appendChild(head);
  card.appendChild(textEl('p', 'chance__title', c.title));
  const meta = c.choice === 'hold' && c.holdUntil ? `${labelOf(c.date)}・見直し ${labelOf(c.holdUntil)}` : labelOf(c.date);
  card.appendChild(textEl('p', 'item-card__meta', meta));

  if (c.choice === 'go') card.appendChild(stageTrack(c.stage));
  if (c.powers.length) {
    const label = c.choice === 'go' ? '使った力' : c.choice === 'pass' ? '足りなかった力' : '必要そうな力';
    const row = document.createElement('div');
    row.className = 'chance__powers';
    row.appendChild(textEl('span', 'practice__label', label));
    c.powers.forEach((k) => row.appendChild(pill(powerOf(k).name, `power-pill power-pill--${k}`)));
    card.appendChild(row);
  }
  if (c.story.trim()) card.appendChild(lineEl('その後', c.story, 'practice__row--insight'));
  if (c.note.trim()) card.appendChild(lineEl(c.choice === 'pass' ? '見送った理由' : 'メモ', c.note, 'practice__row--muted'));

  const actions = document.createElement('div');
  actions.className = 'item-card__actions';
  if (uid && c.choice === 'go' && c.stage !== 'fruit') {
    const next = STAGES[stageIndex(c.stage) + 1];
    actions.appendChild(actionBtn(`stage:${c.id}`, `${next.label}になった！`, 'btn btn--primary btn--sm', async () => {
      await updateChance(uid, c.id, { stage: next.key });
      track('chance_stage', { stage: next.key });
    }, `${next.label}になりました！ +${XP_STAGE[next.key] - XP_STAGE[c.stage]}XP`));
  }
  if (uid && c.choice !== 'go') {
    actions.appendChild(actionBtn(`go:${c.id}`, '寄ってみる', 'btn btn--primary btn--sm', async () => {
      await updateChance(uid, c.id, { choice: 'go', stage: 'seed', holdUntil: '' });
      track('chance_go');
    }, '寄ってみることにしました！ +5XP'));
  }
  if (uid && c.choice === 'hold') {
    actions.append(
      actionBtn(`hold:${c.id}`, 'もう1週間保留', 'btn btn--ghost btn--sm', async () => {
        await updateChance(uid, c.id, { holdUntil: addDays(todayKey(), 7) });
      }, '1週間後にもう一度お知らせします'),
      actionBtn(`pass:${c.id}`, '今回は見送る', 'btn btn--ghost btn--sm', async () => {
        await updateChance(uid, c.id, { choice: 'pass', holdUntil: '' });
        track('chance_pass');
      }, '見送りました。記録は残しておきます'),
    );
  }
  actions.append(
    button('編集', 'text-btn', () => openChanceModal({ id: c.id })),
    button('削除', 'text-btn', () => askConfirm('削除しますか？', `${labelOf(c.date)}の偶然のメモを削除します。元に戻せません。`, '削除する', async () => {
      if (!uid) return;
      const ok = await withLock(`delete:${c.id}`, () => deleteChance(uid, c.id), '削除に失敗しました');
      if (ok) showToast('削除しました');
    })),
  );
  card.appendChild(actions);
  return card;
}

function practiceCard(p: Practice): HTMLElement {
  const s = powerOf(p.power);
  const card = document.createElement('article');
  card.className = 'item-card practice';
  const head = document.createElement('div');
  head.className = 'item-card__head';
  head.append(
    powerMarkEl(p.power, true),
    pill(`${s.name}の稽古`, 'item-card__badge'),
    pill(FEEL_LABEL[p.feel], `feel-pill feel-pill--${p.feel}`),
    pill(`+${practiceXp(p)}XP`, 'xp-pill'),
  );
  card.appendChild(head);
  card.appendChild(textEl('p', 'item-card__meta', labelOf(p.date)));
  if (p.drill.trim()) card.appendChild(lineEl('お題', p.drill, 'practice__row--muted'));
  card.appendChild(lineEl('やってみて', p.result));
  if (p.insight.trim()) card.appendChild(lineEl('気づき', p.insight, 'practice__row--insight'));

  const actions = document.createElement('div');
  actions.className = 'item-card__actions';
  actions.append(
    button('編集', 'text-btn', () => openPracticeModal({ id: p.id })),
    button('削除', 'text-btn', () => askConfirm('削除しますか？', `${labelOf(p.date)}の「${s.name}」の稽古記録を削除します。元に戻せません。`, '削除する', async () => {
      const uid = state.uid;
      if (!uid) return;
      const ok = await withLock(`delete:${p.id}`, () => deletePractice(uid, p.id), '削除に失敗しました');
      if (ok) showToast('削除しました');
    })),
  );
  card.appendChild(actions);
  return card;
}

// ============================================================
// きょう
// ============================================================
function currentDrill(): { power: PowerKey; drill: string; recommended: boolean } {
  const day = todayKey();
  const recommended = todayPower(state.chances, state.practices, state.assessments, day);
  const power = state.pickedPower ?? recommended;
  const drills = powerOf(power).drills;
  return { power, drill: drills[drillIndex(power, day, state.drillOffset, drills.length)], recommended: power === recommended };
}

function renderToday(): void {
  const day = todayKey();
  todayDateEl.textContent = labelOf(day);
  const goes = state.chances.filter((c) => c.choice === 'go');
  todayGo.textContent = String(goes.length);
  todayFruit.textContent = String(goes.filter((c) => c.stage === 'fruit').length);
  todayStreak.textContent = `${streak(state.chances, state.practices)}日`;

  renderSlots();

  const due = dueHolds(state.chances, day);
  dueSection.classList.toggle('hidden', !due.length);
  dueList.replaceChildren(...due.map(chanceCard));

  const assessed = state.assessments.some((a) => a.month === currentMonth());
  assessReminder.classList.toggle('hidden', !state.loaded || assessed);

  const { power, drill, recommended } = currentDrill();
  const s = powerOf(power);
  drillMark.textContent = s.mark;
  drillMark.className = `skill-mark skill-mark--${power}`;
  drillSkill.textContent = `${s.name}（${s.tool}）`;
  const latest = latestAssessment(state.assessments);
  drillReason.textContent = !recommended
    ? 'あなたが選んだ力'
    : latest ? `自己チェックがいちばん低い力（${latest.scores[power]}／5）` : 'きょうの日替わりの力';
  drillText.textContent = drill;
  drillTip.textContent = `コツ：${s.tip}`;

  todayPowerChips.replaceChildren(...POWERS.map((x) => radioChip(x.name, x.key === power, () => {
    state.pickedPower = x.key;
    state.drillOffset = 0;
    renderToday();
  })));

  if (!state.loaded) {
    todayList.replaceChildren(emptyState('読み込み中…'));
    return;
  }
  const todays: HTMLElement[] = [
    ...state.chances.filter((c) => c.date === day && !due.includes(c)).map(chanceCard),
    ...state.practices.filter((p) => p.date === day).map(practiceCard),
  ];
  todayList.replaceChildren(...(todays.length
    ? todays
    : [emptyState('まだきょうの記録はありません。気になる偶然があったらメモし、お題を1つやってみましょう。')]));
}

// ============================================================
// あき枠（週に1つ、予定を入れない枠）
// ============================================================
const slotLabel = (slot: OpenSlot): string => `${labelOf(slot.date)} ${SLOT_PART_LABEL[slot.part]}`;

function slotResultButtons(slot: OpenSlot): HTMLElement {
  const uid = state.uid;
  const row = document.createElement('div');
  row.className = 'item-card__actions';
  if (!uid) return row;
  SLOT_RESULTS.forEach((r) => {
    row.appendChild(actionBtn(`slotres:${slot.week}`, r.label, 'btn btn--ghost btn--sm', async () => {
      await setSlotResult(uid, slot.week, r.key);
      track('slot_result', { result: r.key });
    }, r.done));
  });
  return row;
}

function slotPickCard(week: string, day: string): HTMLElement {
  const uid = state.uid;
  const card = document.createElement('article');
  card.className = 'item-card slot-card';
  const days: string[] = [];
  for (let k = day; weekStart(k) === week; k = addDays(k, 1)) days.push(k);
  if (state.slotDate && !days.includes(state.slotDate)) state.slotDate = null;

  const dayChips = document.createElement('div');
  dayChips.className = 'filter-chips filter-chips--tight';
  dayChips.setAttribute('role', 'radiogroup');
  dayChips.append(...days.map((k) =>
    radioChip(k === day ? `${labelOf(k)}・きょう` : labelOf(k), state.slotDate === k, () => {
      state.slotDate = k;
      renderSlots();
    })));

  const partChips = document.createElement('div');
  partChips.className = 'filter-chips filter-chips--tight';
  partChips.setAttribute('role', 'radiogroup');
  partChips.append(...SLOT_PARTS.map((p) =>
    radioChip(p.label, state.slotPart === p.key, () => {
      state.slotPart = p.key;
      renderSlots();
    })));

  const save = button('この枠を空けておく', 'btn btn--primary', () => {
    const date = state.slotDate;
    if (!uid) return;
    if (!date) {
      showToast('空けておく日を選んでください');
      return;
    }
    const part = state.slotPart;
    void withLock('slot:save', async () => {
      await saveOpenSlot(uid, { week, date, part, result: '' });
      state.slotDate = null;
      track('slot_set');
      showToast(`${labelOf(date)}の${SLOT_PART_LABEL[part]}を空けておきます`);
    });
  });
  save.disabled = state.pending.has('slot:save');

  card.append(
    pill('まだ決めていません', 'item-card__badge'),
    textEl('p', 'chance__title', '今週、予定を入れない枠を1つ決めましょう'),
    textEl('p', 'item-card__meta', 'いつ空けますか？'),
    dayChips,
    textEl('p', 'item-card__meta', '時間帯は？'),
    partChips,
    save,
  );
  return card;
}

function slotCurrentCard(slot: OpenSlot, day: string): HTMLElement {
  const uid = state.uid;
  const card = document.createElement('article');
  card.className = 'item-card slot-card';
  const label = slotLabel(slot);

  if (slot.result) {
    card.append(
      pill(SLOT_RESULT_LABEL[slot.result], 'item-card__badge'),
      textEl('p', 'chance__title', label),
      textEl('p', 'item-card__meta', '今週のあき枠は、ふりかえり済みです。'),
    );
    return card;
  }

  if (slot.date <= day) {
    const isToday = slot.date === day;
    card.append(
      pill(isToday ? 'きょうは空き枠' : 'ふりかえり', 'item-card__badge'),
      textEl('p', 'chance__title', label),
      textEl('p', 'item-card__meta', isToday
        ? '予定は入れずに、ふらっと寄り道してみましょう。何かあったら、あとでメモに残せます。'
        : 'この枠はどうでしたか？'),
    );
    const actions = slotResultButtons(slot);
    if (isToday) actions.prepend(button('偶然をメモする', 'btn btn--primary btn--sm', () => openChanceModal({})));
    card.appendChild(actions);
    return card;
  }

  const left = Math.round((parseKey(slot.date).getTime() - parseKey(day).getTime()) / 86400000);
  card.append(
    pill(`あと${left}日`, 'item-card__badge'),
    textEl('p', 'chance__title', label),
    textEl('p', 'item-card__meta', 'この枠には予定を入れないでおきましょう。誘いや頼まれごとが来たら、ここで受けてみる手もあります。'),
  );
  if (uid) {
    const actions = document.createElement('div');
    actions.className = 'item-card__actions';
    actions.appendChild(button('枠を変える', 'text-btn', () => {
      void withLock('slot:change', () => deleteOpenSlot(uid, slot.week));
    }));
    card.appendChild(actions);
  }
  return card;
}

function renderSlots(): void {
  slotSection.classList.toggle('hidden', !state.slotsLoaded);
  if (!state.slotsLoaded) return;
  const day = todayKey();
  const week = weekStart(day);
  const cards: HTMLElement[] = [];

  const past = pendingPastSlot(state.slots, day, week);
  if (past) {
    const card = document.createElement('article');
    card.className = 'item-card slot-card';
    card.append(
      pill('ふりかえり', 'item-card__badge'),
      textEl('p', 'chance__title', `前のあき枠（${slotLabel(past)}）はどうでしたか？`),
      slotResultButtons(past),
    );
    cards.push(card);
  }

  const mine = state.slots.find((s) => s.week === week);
  cards.push(mine ? slotCurrentCard(mine, day) : slotPickCard(week, day));

  const kept = keptSlots(state.slots);
  if (kept) cards.push(textEl('p', 'slot-note', `これまでに空けられた週：${kept}回`));
  slotList.replaceChildren(...cards);
}

// ============================================================
// 「いつかやる」（保留）のリセット
// ============================================================
const RESET_OPTIONS: { key: ResetChoice; label: string }[] = [
  { key: 'go', label: '寄ってみる' },
  { key: 'pass', label: '見送る' },
  { key: 'keep', label: '保留のまま' },
];

const holdsOldestFirst = (): Chance[] =>
  state.chances
    .filter((c) => c.choice === 'hold')
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);

function renderResetModal(): void {
  const holds = holdsOldestFirst();
  resetListEl.replaceChildren(...holds.map((c) => {
    const row = document.createElement('div');
    row.className = 'reset-row';
    const chips = document.createElement('div');
    chips.className = 'filter-chips filter-chips--tight';
    chips.setAttribute('role', 'radiogroup');
    const cur = state.resetChoices[c.id] ?? 'pass';
    chips.append(...RESET_OPTIONS.map((o) =>
      radioChip(o.label, cur === o.key, () => {
        state.resetChoices[c.id] = o.key;
        renderResetModal();
      })));
    row.append(
      textEl('p', 'reset-row__title', c.title),
      textEl('p', 'item-card__meta', labelOf(c.date)),
      chips,
    );
    return row;
  }));
  const counts: Record<ResetChoice, number> = { go: 0, pass: 0, keep: 0 };
  holds.forEach((c) => { counts[state.resetChoices[c.id] ?? 'pass'] += 1; });
  resetSummary.textContent = `寄ってみる ${counts.go}件・見送る ${counts.pass}件・保留のまま ${counts.keep}件`;
  btnResetSubmit.disabled = state.pending.has('reset') || counts.go + counts.pass === 0;
}

function openResetModal(): void {
  state.resetChoices = {};
  renderResetModal();
  openOverlay(resetOverlay);
}

const closeResetModal = (): void => closeOverlay(resetOverlay);

btnResetHolds.addEventListener('click', openResetModal);
$('btn-reset-close').addEventListener('click', closeResetModal);
$('btn-reset-cancel').addEventListener('click', closeResetModal);

btnResetSubmit.addEventListener('click', () => {
  const uid = state.uid;
  if (!uid) return;
  const items: HoldResetItem[] = [];
  holdsOldestFirst().forEach((c) => {
    const choice = state.resetChoices[c.id] ?? 'pass';
    if (choice !== 'keep') items.push({ id: c.id, choice });
  });
  if (!items.length) {
    showToast('整理する保留がありません');
    return;
  }
  const go = items.filter((i) => i.choice === 'go').length;
  const pass = items.length - go;
  askConfirm(
    '保留をリセットしますか？',
    `${pass}件を見送り、${go}件を寄ってみることにします。見送った偶然も寄り道ログに残り、あとから「寄ってみる」に戻せます。`,
    'リセットする',
    async () => {
      const ok = await withLock('reset', () => resetHolds(uid, items), 'リセットに失敗しました');
      if (!ok) return;
      closeResetModal();
      track('hold_reset', { go, pass });
      showToast('保留をリセットしました。身軽になりましたね');
    },
  );
});

btnDrillDone.addEventListener('click', () => {
  const { power, drill } = currentDrill();
  openPracticeModal({ power, drill });
});

btnDrillNext.addEventListener('click', () => {
  state.drillOffset += 1;
  renderToday();
});

// ============================================================
// 寄り道ログ
// ============================================================
const LOG_FILTERS: { key: LogFilter; label: string; match: (c: Chance) => boolean }[] = [
  { key: 'all', label: 'すべて', match: () => true },
  { key: 'go', label: '寄ってみた', match: (c) => c.choice === 'go' },
  { key: 'fruit', label: '実った', match: (c) => c.choice === 'go' && c.stage === 'fruit' },
  { key: 'hold', label: '保留中', match: (c) => c.choice === 'hold' },
  { key: 'pass', label: '見送った', match: (c) => c.choice === 'pass' },
];

function renderLog(): void {
  const all = state.chances;
  const holdCount = all.filter((c) => c.choice === 'hold').length;
  resetReminder.classList.toggle('hidden', holdCount === 0);
  resetHoldCount.textContent = String(holdCount);
  logChips.replaceChildren(...LOG_FILTERS.map((f) =>
    radioChip(`${f.label} ${all.filter(f.match).length}`, state.logFilter === f.key, () => {
      state.logFilter = f.key;
      renderLog();
    })));

  if (!state.loaded) {
    logList.replaceChildren(emptyState('読み込み中…'));
    return;
  }
  const filter = LOG_FILTERS.find((f) => f.key === state.logFilter) ?? LOG_FILTERS[0];
  const q = state.search.trim().toLowerCase();
  const list = all
    .filter(filter.match)
    .filter((c) => !q || [kindLabel(c.kind), c.title, c.note, c.story, ...c.powers.map((k) => powerOf(k).name)]
      .some((t) => t.toLowerCase().includes(q)));
  logList.replaceChildren(...(list.length
    ? list.map(chanceCard)
    : [emptyState(all.length
      ? '条件に合う偶然はありません。'
      : 'まだ偶然のメモはありません。「きょう」タブの「偶然をメモする」から、たまたまの出会いや誘いを記録しましょう。')]));
}

// ============================================================
// 道具図鑑
// ============================================================
function renderZukan(): void {
  const stats = powerStats(state.chances, state.practices);
  const latest = latestAssessment(state.assessments);
  zukanList.replaceChildren(...POWERS.map((s) => {
    const st = stats[s.key];
    const card = document.createElement('article');
    card.className = 'item-card zukan-card';
    const head = document.createElement('div');
    head.className = 'zukan-card__head';
    const titleWrap = document.createElement('div');
    titleWrap.append(textEl('h3', 'zukan-card__name', `${s.name}　—　${s.tool}`), textEl('p', 'zukan-card__short', s.short));
    head.append(powerMarkEl(s.key), titleWrap);
    card.appendChild(head);

    const meta = document.createElement('div');
    meta.className = 'zukan-card__meta';
    meta.append(
      pill(`Lv.${st.level}`, 'level-pill'),
      pill(`稽古${st.practices}回`, 'source-pill'),
      pill(`この力で寄り道${st.chances}回`, 'source-pill'),
    );
    if (latest) meta.appendChild(pill(`自己チェック ${latest.scores[s.key]}／5`, 'source-pill'));
    card.appendChild(meta);

    card.appendChild(lineEl('なぜ偶然に効く？', s.why));
    card.appendChild(lineEl('鍛えるコツ', s.tip, 'practice__row--insight'));

    const details = document.createElement('details');
    details.className = 'zukan-card__drills';
    details.appendChild(textEl('summary', '', `お題の例（${s.drills.length}）`));
    const ul = document.createElement('ul');
    s.drills.forEach((d) => ul.appendChild(textEl('li', '', d)));
    details.appendChild(ul);
    card.appendChild(details);

    const actions = document.createElement('div');
    actions.className = 'item-card__actions';
    actions.append(button('この力で稽古する', 'btn btn--primary btn--sm', () => {
      state.pickedPower = s.key;
      state.drillOffset = 0;
      switchTab('today');
    }));
    card.appendChild(actions);
    return card;
  }));
}

// ============================================================
// 探検記録
// ============================================================
function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
  return el;
}

function renderRadar(): void {
  const W = 360;
  const H = 300;
  const cx = W / 2;
  const cy = H / 2 + 6;
  const R = 100;
  const n = POWERS.length;
  const pt = (i: number, r: number): [number, number] => {
    const a = -Math.PI / 2 + (Math.PI * 2 * i) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'radar__svg', role: 'img', 'aria-label': '5つの力のレーダーチャート' });

  for (let lv = 1; lv <= 5; lv++) {
    const pts = POWERS.map((_, i) => pt(i, (R * lv) / 5).join(',')).join(' ');
    root.appendChild(svg('polygon', { points: pts, class: 'radar__grid' }));
  }
  POWERS.forEach((s, i) => {
    const [x, y] = pt(i, R);
    root.appendChild(svg('line', { x1: cx, y1: cy, x2: x, y2: y, class: 'radar__axis' }));
    const [lx, ly] = pt(i, R + 20);
    const anchor = Math.abs(lx - cx) < 4 ? 'middle' : lx > cx ? 'start' : 'end';
    const label = svg('text', { x: lx, y: ly + 5, 'text-anchor': anchor, class: 'radar__label' });
    label.textContent = s.name;
    root.appendChild(label);
  });

  const list = state.assessments;
  const latest = list[list.length - 1];
  const prev = list[list.length - 2];
  const shape = (a: Assessment, cls: string): SVGPolygonElement =>
    svg('polygon', { points: POWERS.map((s, i) => pt(i, (R * a.scores[s.key]) / 5).join(',')).join(' '), class: cls });
  if (prev) root.appendChild(shape(prev, 'radar__shape radar__shape--prev'));
  if (latest) {
    root.appendChild(shape(latest, 'radar__shape'));
    POWERS.forEach((s, i) => {
      const [x, y] = pt(i, (R * latest.scores[s.key]) / 5);
      root.appendChild(svg('circle', { cx: x, cy: y, r: 4, class: 'radar__dot' }));
    });
  }
  radarEl.replaceChildren(root);

  const fmt = (m: string): string => `${Number(m.slice(0, 4))}年${Number(m.slice(5, 7))}月`;
  if (!latest) {
    radarLegend.textContent = 'まだ自己チェックがありません。月に1回、5つの力をふりかえりましょう。';
  } else {
    radarLegend.textContent = prev ? `実線：${fmt(latest.month)}　点線：${fmt(prev.month)}` : `${fmt(latest.month)}の自己チェック`;
  }
  radarMemo.textContent = latest?.memo ? `ひとこと：${latest.memo}` : '';
  radarMemo.classList.toggle('hidden', !latest?.memo);
}

function renderStageFunnel(): void {
  const counts = stageCounts(state.chances);
  // 「芽」以上に育った数も含めて、その段階に到達した数を表示する
  const reached = STAGES.map((s, i) => ({
    ...s,
    count: STAGES.slice(i).reduce((sum, x) => sum + counts[x.key], 0),
  }));
  const max = Math.max(1, reached[0].count);
  stageFunnel.replaceChildren(...reached.map((s) => {
    const row = document.createElement('div');
    row.className = `stage-funnel__row stage-funnel__row--${s.key}`;
    const track = document.createElement('div');
    track.className = 'stage-funnel__track';
    const fill = document.createElement('div');
    fill.className = 'stage-funnel__fill';
    fill.style.width = `${Math.round((s.count / max) * 100)}%`;
    track.appendChild(fill);
    row.append(textEl('span', 'stage-funnel__label', s.label), track, textEl('span', 'stage-funnel__count', `${s.count}`));
    row.title = s.desc;
    return row;
  }));
}

function renderCalendar(): void {
  const y = state.calYear;
  const m0 = state.calMonth0;
  calTitle.textContent = `${y}年${m0 + 1}月の探検`;
  const counts = countByDate(state.chances, state.practices);
  const prefix = monthKey(y, m0);
  const cells: HTMLElement[] = ['日', '月', '火', '水', '木', '金', '土'].map((w) => textEl('span', 'calendar__week', w));
  const first = new Date(y, m0, 1).getDay();
  for (let i = 0; i < first; i++) cells.push(textEl('span', 'calendar__cell is-empty', ''));
  const today = todayKey();
  for (let d = 1; d <= daysInMonth(y, m0); d++) {
    const key = `${prefix}-${String(d).padStart(2, '0')}`;
    const c = counts.get(key) ?? 0;
    const cell = textEl('span', `calendar__cell${c ? ` is-done${c >= 3 ? ' is-lv3' : c === 2 ? ' is-lv2' : ''}` : ''}${key === today ? ' is-today' : ''}`, String(d));
    if (c) cell.title = `${c}件の記録`;
    cells.push(cell);
  }
  calendarEl.replaceChildren(...cells);
}

function renderRecord(): void {
  const xp = totalXp(state.chances, state.practices);
  const t = titleOf(xp);
  statTitle.textContent = t.name;
  statXp.textContent = String(xp);
  if (t.next) {
    const ratio = (xp - t.min) / (t.next.min - t.min);
    statTitleFill.style.width = `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%`;
    statNext.textContent = `「${t.next.name}」まであと${t.next.min - xp}XP`;
  } else {
    statTitleFill.style.width = '100%';
    statNext.textContent = '最高の階級です。あなたは伝説の探検家！';
  }
  statChances.textContent = String(state.chances.length);
  const rate = goRate(state.chances);
  statRate.textContent = rate === null ? '-' : `${Math.round(rate * 100)}%`;
  statPractice.textContent = String(state.practices.length);

  renderStageFunnel();
  renderRadar();

  const stats = powerStats(state.chances, state.practices);
  powerLevels.replaceChildren(...POWERS.map((s) => {
    const st = stats[s.key];
    const row = document.createElement('div');
    row.className = 'field-level';
    const head = document.createElement('div');
    head.className = 'field-level__head';
    head.append(
      powerMarkEl(s.key, true),
      textEl('span', 'field-level__name', s.name),
      textEl('span', 'field-level__lv', `Lv.${st.level}`),
      textEl('span', 'field-level__meta', `稽古${st.practices}・寄り道${st.chances}`),
    );
    const track = document.createElement('div');
    track.className = 'field-level__track';
    const fill = document.createElement('div');
    fill.className = 'field-level__fill';
    fill.style.width = `${Math.round(st.progress * 100)}%`;
    track.appendChild(fill);
    row.append(head, track);
    return row;
  }));

  const weak = weakFromPass(state.chances);
  passInsight.textContent = weak
    ? `見送った偶然でいちばん多く「足りなかった」と選ばれたのは「${powerOf(weak).name}」です。この力のお題をやってみると、次の機会に寄り道しやすくなります。`
    : '';
  passInsight.classList.toggle('hidden', !weak);

  renderCalendar();
}

$('btn-cal-prev').addEventListener('click', () => {
  const d = new Date(state.calYear, state.calMonth0 - 1, 1);
  state.calYear = d.getFullYear();
  state.calMonth0 = d.getMonth();
  renderCalendar();
});
$('btn-cal-next').addEventListener('click', () => {
  const d = new Date(state.calYear, state.calMonth0 + 1, 1);
  state.calYear = d.getFullYear();
  state.calMonth0 = d.getMonth();
  renderCalendar();
});

// ============================================================
// Render all
// ============================================================
function renderTabs(): void {
  tabButtons.forEach((b) => {
    const on = b.dataset.tab === state.tab;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-selected', String(on));
  });
  panels.forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== state.tab));
}

function switchTab(tab: Tab): void {
  state.tab = tab;
  renderAll();
  window.scrollTo({ top: 0 });
}

function renderAll(): void {
  const due = dueHolds(state.chances, todayKey()).length;
  countDue.textContent = due ? String(due) : '';
  renderTabs();
  renderToday();
  renderLog();
  renderZukan();
  renderRecord();
  btnChanceSubmit.disabled = state.pending.has('chance');
  btnPracticeSubmit.disabled = state.pending.has('practice');
  btnAssessSubmit.disabled = state.pending.has('assess');
  if (resetOverlay.classList.contains('is-open')) renderResetModal();
}

// ============================================================
// 偶然のメモ
// ============================================================
function renderChanceFormChoices(): void {
  kindChips.replaceChildren(...KINDS.map((k) => {
    const b = radioChip(k.label, k.key === state.formKind, () => {
      state.formKind = k.key;
      renderChanceFormChoices();
    });
    if (k.hint) b.title = k.hint;
    return b;
  }));

  choiceOptions.replaceChildren(...CHOICES.map((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `segmented__btn segmented__btn--${c.key}${state.formChoice === c.key ? ' is-active' : ''}`;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(state.formChoice === c.key));
    b.append(textEl('span', 'segmented__label', c.label), textEl('span', 'segmented__desc', c.desc));
    b.addEventListener('click', () => {
      state.formChoice = c.key;
      if (c.key === 'hold' && !inputHoldUntil.value) inputHoldUntil.value = addDays(todayKey(), 7);
      renderChanceFormChoices();
    });
    return b;
  }));

  const choice = state.formChoice;
  holdField.classList.toggle('hidden', choice !== 'hold');
  stageField.classList.toggle('hidden', choice !== 'go');
  storyField.classList.toggle('hidden', choice !== 'go');
  holdChips.replaceChildren(...HOLD_DAYS.map((h) => {
    const date = addDays(todayKey(), h.days);
    return radioChip(h.label, inputHoldUntil.value === date, () => {
      inputHoldUntil.value = date;
      renderChanceFormChoices();
    });
  }));
  stageChips.replaceChildren(...STAGES.map((s) => {
    const b = radioChip(`${s.label}：${s.desc}`, s.key === state.formStage, () => {
      state.formStage = s.key;
      renderChanceFormChoices();
    });
    return b;
  }));

  powersLabel.firstChild!.textContent = choice === 'go' ? 'どの力で寄り道できた？'
    : choice === 'pass' ? '足りなかった力は？' : '必要そうな力は？';
  powerChips.replaceChildren(...POWERS.map((p) => {
    const on = state.formPowers.includes(p.key);
    const b = button(p.name, `chip${on ? ' is-active' : ''}`, () => {
      state.formPowers = on ? state.formPowers.filter((k) => k !== p.key) : [...state.formPowers, p.key];
      renderChanceFormChoices();
    });
    b.setAttribute('aria-pressed', String(on));
    return b;
  }));
  noteLabel.firstChild!.textContent = choice === 'pass' ? '見送った理由' : 'メモ';
  inputNote.placeholder = choice === 'pass'
    ? '例：時間が合わなかった。次に誘われたら行ってみたい'
    : '例：最初は迷ったけれど、行ってみたら楽しかった';

  renderPastHint();
}

/** 新しく偶然をメモするとき、同じ種類で前に見送った偶然を見せる */
function renderPastHint(): void {
  const past = state.editingChanceId ? [] : state.chances
    .filter((c) => c.kind === state.formKind && c.choice === 'pass')
    .slice(0, 2);
  chancePast.classList.toggle('hidden', !past.length);
  if (!past.length) {
    chancePast.replaceChildren();
    return;
  }
  chancePast.replaceChildren(
    textEl('p', 'past-hint__title', `前に見送った「${kindLabel(state.formKind)}」`),
    ...past.map((c) => {
      const item = document.createElement('div');
      item.className = 'past-hint__item';
      item.appendChild(textEl('p', 'past-hint__text', `${labelOf(c.date)}：${c.title}`));
      if (c.note.trim()) item.appendChild(textEl('p', 'past-hint__note', `理由：${c.note}`));
      return item;
    }),
  );
}

function openChanceModal(opts: { id?: string }): void {
  const c = findChance(opts.id ?? null);
  state.editingChanceId = c ? c.id : null;
  chanceModalTitle.textContent = c ? '偶然のメモを編集' : '偶然をメモする';
  btnChanceSubmit.textContent = c ? '保存する' : 'メモする';
  state.formKind = c?.kind ?? 'meet';
  state.formChoice = c?.choice ?? 'go';
  state.formStage = c?.stage ?? 'seed';
  state.formPowers = c ? [...c.powers] : [];
  inputTitle.value = c?.title ?? '';
  inputChanceDate.value = c?.date ?? todayKey();
  inputChanceDate.max = todayKey();
  inputHoldUntil.value = c?.holdUntil || (state.formChoice === 'hold' ? addDays(todayKey(), 7) : '');
  inputStory.value = c?.story ?? '';
  inputNote.value = c?.note ?? '';
  renderChanceFormChoices();
  openOverlay(chanceOverlay);
  window.setTimeout(() => inputTitle.focus(), 50);
}

const closeChanceModal = (): void => {
  closeOverlay(chanceOverlay);
  state.editingChanceId = null;
};

inputHoldUntil.addEventListener('change', renderChanceFormChoices);

chanceForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const uid = state.uid;
  if (!uid) return;
  const title = inputTitle.value.trim();
  if (!title) {
    showToast('どんな偶然だったかを書いてください');
    inputTitle.focus();
    return;
  }
  const date = inputChanceDate.value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > todayKey()) {
    showToast('出会った日は今日までの日付にしてください');
    return;
  }
  const choice = state.formChoice;
  const holdUntil = choice === 'hold' ? inputHoldUntil.value : '';
  if (choice === 'hold' && !/^\d{4}-\d{2}-\d{2}$/.test(holdUntil)) {
    showToast('いつ見直すかを選んでください');
    return;
  }
  const input: ChanceInput = {
    date,
    kind: state.formKind,
    title,
    choice,
    holdUntil,
    stage: choice === 'go' ? state.formStage : 'seed',
    powers: POWER_KEYS.filter((k) => state.formPowers.includes(k)),
    note: inputNote.value.trim(),
    story: inputStory.value.trim(),
  };
  const editingId = state.editingChanceId;
  void withLock('chance', async () => {
    if (editingId) await updateChance(uid, editingId, input);
    else await createChance(uid, input);
    closeChanceModal();
    if (editingId) {
      showToast('保存しました');
    } else {
      track('chance_create', { choice });
      showToast(choice === 'go'
        ? `いい寄り道です！ +${chanceXp(input)}XP`
        : choice === 'hold' ? `メモしました。${labelOf(holdUntil)}にお知らせします` : 'メモしました。見送った記録も次に生きます');
    }
  });
});

$('btn-chance-close').addEventListener('click', closeChanceModal);
$('btn-chance-cancel').addEventListener('click', closeChanceModal);

// ============================================================
// 稽古の記録
// ============================================================
function renderPracticeFormChoices(): void {
  practicePowerChips.replaceChildren(...POWERS.map((s) => radioChip(s.name, s.key === state.formPower, () => {
    if (state.formPower !== s.key) state.formDrill = '';
    state.formPower = s.key;
    renderPracticeFormChoices();
  })));
  practiceDrill.textContent = state.formDrill ? `お題：${state.formDrill}` : '';
  practiceDrill.classList.toggle('hidden', !state.formDrill);

  feelOptions.replaceChildren(...FEELS.map((f) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `segmented__btn segmented__btn--${f.key}${state.formFeel === f.key ? ' is-active' : ''}`;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(state.formFeel === f.key));
    b.append(textEl('span', 'segmented__label', f.label), textEl('span', 'segmented__desc', f.desc));
    b.addEventListener('click', () => {
      state.formFeel = f.key;
      renderPracticeFormChoices();
    });
    return b;
  }));
}

function openPracticeModal(opts: { id?: string; power?: PowerKey; drill?: string }): void {
  const p = findPractice(opts.id ?? null);
  state.editingPracticeId = p ? p.id : null;
  practiceModalTitle.textContent = p ? '稽古の記録を編集' : '稽古を記録する';
  btnPracticeSubmit.textContent = p ? '保存する' : '記録する';
  state.formPower = p?.power ?? opts.power ?? currentDrill().power;
  state.formDrill = p?.drill ?? opts.drill ?? '';
  state.formFeel = p?.feel ?? 'good';
  inputDate.value = p?.date ?? todayKey();
  inputDate.max = todayKey();
  inputResult.value = p?.result ?? '';
  inputInsight.value = p?.insight ?? '';
  renderPracticeFormChoices();
  openOverlay(practiceOverlay);
  window.setTimeout(() => inputResult.focus(), 50);
}

const closePracticeModal = (): void => {
  closeOverlay(practiceOverlay);
  state.editingPracticeId = null;
};

practiceForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const uid = state.uid;
  if (!uid) return;
  const date = inputDate.value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > todayKey()) {
    showToast('やった日は今日までの日付にしてください');
    return;
  }
  const result = inputResult.value.trim();
  if (!result) {
    showToast('やってみてどうだったかを書いてください');
    inputResult.focus();
    return;
  }
  const input: PracticeInput = {
    power: state.formPower,
    date,
    drill: state.formDrill,
    result,
    feel: state.formFeel,
    insight: inputInsight.value.trim(),
  };
  const editingId = state.editingPracticeId;
  void withLock('practice', async () => {
    if (editingId) await updatePractice(uid, editingId, input);
    else await createPractice(uid, input);
    closePracticeModal();
    if (editingId) {
      showToast('保存しました');
    } else {
      track('practice_create', { power: input.power });
      showToast(`稽古しました！ +${practiceXp(input)}XP`);
      state.pickedPower = null;
      state.drillOffset = 0;
    }
  });
});

$('btn-practice-close').addEventListener('click', closePracticeModal);
$('btn-practice-cancel').addEventListener('click', closePracticeModal);

// ============================================================
// 自己チェック
// ============================================================
function renderAssessRows(): void {
  assessRows.replaceChildren(...POWERS.map((s) => {
    const row = document.createElement('div');
    row.className = 'assess-row';
    const head = document.createElement('div');
    head.className = 'assess-row__head';
    head.append(powerMarkEl(s.key, true), textEl('span', 'assess-row__name', s.name));
    const scores = document.createElement('div');
    scores.className = 'score-btns';
    scores.setAttribute('role', 'radiogroup');
    scores.setAttribute('aria-label', s.name);
    SCORE_LEVELS.forEach((lv) => {
      const on = state.assessScores[s.key] === lv.value;
      const b = button(String(lv.value), `score-btn${on ? ' is-active' : ''}`, () => {
        state.assessScores[s.key] = lv.value;
        renderAssessRows();
      });
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(on));
      b.title = lv.label;
      scores.appendChild(b);
    });
    row.append(head, scores);
    return row;
  }));
}

function openAssessModal(): void {
  const month = currentMonth();
  const existing = state.assessments.find((a) => a.month === month);
  const base = existing ?? latestAssessment(state.assessments);
  assessModalTitle.textContent = `${Number(month.slice(5, 7))}月の自己チェック`;
  state.assessScores = {} as Record<PowerKey, number>;
  POWER_KEYS.forEach((k) => { state.assessScores[k] = base ? base.scores[k] : 0; });
  inputAssessMemo.value = existing?.memo ?? '';
  renderAssessRows();
  openOverlay(assessOverlay);
}

assessForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const uid = state.uid;
  if (!uid) return;
  const missing = POWERS.filter((s) => !state.assessScores[s.key]);
  if (missing.length) {
    showToast(`「${missing[0].name}」の点数を選んでください`);
    return;
  }
  const a: Assessment = { month: currentMonth(), scores: { ...state.assessScores }, memo: inputAssessMemo.value.trim() };
  void withLock('assess', async () => {
    await saveAssessment(uid, a);
    closeOverlay(assessOverlay);
    track('assess_save');
    showToast('自己チェックを保存しました。伸ばしたい力のお題が出やすくなります');
  });
});

$('btn-assess').addEventListener('click', openAssessModal);
$('btn-assess-reminder').addEventListener('click', openAssessModal);
$('btn-assess-close').addEventListener('click', () => closeOverlay(assessOverlay));
$('btn-assess-cancel').addEventListener('click', () => closeOverlay(assessOverlay));

// ============================================================
// 確認ダイアログ
// ============================================================
btnConfirmCancel.addEventListener('click', () => {
  state.confirmAction = null;
  closeOverlay(confirmOverlay);
});

btnConfirmOk.addEventListener('click', () => {
  const action = state.confirmAction;
  state.confirmAction = null;
  closeOverlay(confirmOverlay);
  if (action) void action();
});

// ============================================================
// フィードバック
// ============================================================
feedbackBtn.addEventListener('click', () => {
  openOverlay(feedbackOverlay);
  window.setTimeout(() => inputFeedbackMessage.focus(), 50);
});
btnFeedbackClose.addEventListener('click', () => closeOverlay(feedbackOverlay));

btnFeedbackSend.addEventListener('click', async () => {
  const message = inputFeedbackMessage.value.trim();
  if (!message) {
    showToast('内容を入力してください');
    return;
  }
  if (btnFeedbackSend.disabled) return;
  btnFeedbackSend.disabled = true;
  btnFeedbackSend.textContent = '送信中…';
  const ok = await submitFeedback(message);
  btnFeedbackSend.disabled = false;
  btnFeedbackSend.textContent = '送信する';
  if (ok) {
    inputFeedbackMessage.value = '';
    closeOverlay(feedbackOverlay);
    showToast('送信しました。ありがとうございます！');
  } else {
    showToast('送信に失敗しました。時間をおいて再度お試しください');
  }
});

// オーバーレイの背景クリックで閉じる（確認ダイアログは誤操作防止のため除外）
[chanceOverlay, practiceOverlay, assessOverlay, feedbackOverlay, resetOverlay].forEach((overlay) => {
  overlay.addEventListener('click', (e) => {
    if (e.target !== overlay) return;
    if (overlay === chanceOverlay) closeChanceModal();
    else if (overlay === practiceOverlay) closePracticeModal();
    else closeOverlay(overlay);
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  closeChanceModal();
  closePracticeModal();
  closeOverlay(assessOverlay);
  closeOverlay(feedbackOverlay);
  closeResetModal();
  closeOverlay(confirmOverlay);
  state.confirmAction = null;
});

// ============================================================
// Tabs / buttons
// ============================================================
tabButtons.forEach((b) => b.addEventListener('click', () => switchTab((b.dataset.tab as Tab) || 'today')));

$('btn-fab').addEventListener('click', () => openChanceModal({}));
$('btn-catch').addEventListener('click', () => openChanceModal({}));

inputSearch.addEventListener('input', () => {
  state.search = inputSearch.value;
  renderLog();
});

// ============================================================
// Auth
// ============================================================
btnGoogleLogin.addEventListener('click', async () => {
  if (btnGoogleLogin.disabled) return;
  btnGoogleLogin.disabled = true;
  try {
    await loginWithGoogle();
    track('login');
  } catch (err) {
    console.error(err);
    const code = (err as { code?: string }).code;
    if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
      showToast('ログインに失敗しました。もう一度お試しください');
    }
  } finally {
    btnGoogleLogin.disabled = false;
  }
});

btnLogout.addEventListener('click', async () => {
  try {
    await logout();
  } catch (err) {
    console.error(err);
    showToast('ログアウトに失敗しました');
  }
});

function stopSubscriptions(): void {
  state.unsubscribers.forEach((u) => u());
  state.unsubscribers = [];
}

onAuthChange((user: User | null) => {
  stopSubscriptions();
  if (!user) {
    state.uid = null;
    state.chances = [];
    state.practices = [];
    state.assessments = [];
    state.slots = [];
    state.slotsLoaded = false;
    state.loaded = false;
    loginScreen.classList.remove('hidden');
    appEl.classList.add('hidden');
    userInfo.classList.add('hidden');
    return;
  }
  state.uid = user.uid;
  loginScreen.classList.add('hidden');
  appEl.classList.remove('hidden');
  userInfo.classList.remove('hidden');
  userAvatar.src = user.photoURL ?? '';
  userAvatar.classList.toggle('hidden', !user.photoURL);
  userName.textContent = user.displayName ?? '';
  renderAll();

  const onError = (err: Error): void => {
    console.error(err);
    showToast('データの読み込みに失敗しました。再読み込みしてください');
  };
  let pendingLoads = 2;
  const markLoaded = (): void => {
    pendingLoads -= 1;
    if (pendingLoads <= 0) state.loaded = true;
  };
  let chancesFirst = true;
  let practicesFirst = true;
  state.unsubscribers.push(subscribeChances(user.uid, (items) => {
    state.chances = items;
    if (chancesFirst) { chancesFirst = false; markLoaded(); }
    renderAll();
  }, onError));
  state.unsubscribers.push(subscribePractices(user.uid, (items) => {
    state.practices = items;
    if (practicesFirst) { practicesFirst = false; markLoaded(); }
    renderAll();
  }, onError));
  let slotsFirst = true;
  state.unsubscribers.push(subscribeOpenSlots(user.uid, (items) => {
    state.slots = items;
    if (slotsFirst) { slotsFirst = false; state.slotsLoaded = true; }
    renderAll();
  }, onError));
  state.unsubscribers.push(subscribeAssessments(user.uid, (items) => {
    state.assessments = items;
    renderAll();
  }, onError));
});

scoreScale.textContent = SCORE_LEVELS.map((l) => `${l.value}：${l.label}`).join('　');

// 日付が変わったら「きょう」の表示を更新する
let lastDay = todayKey();
window.setInterval(() => {
  const t = todayKey();
  if (t !== lastDay) {
    lastDay = t;
    state.drillOffset = 0;
    renderAll();
  }
}, 60 * 1000);
