/** 5つの力のキー（options.ts の POWERS と対応） */
export type PowerKey = 'curiosity' | 'persistence' | 'optimism' | 'flexibility' | 'adventure';

/** 偶然の種類 */
export type ChanceKind = 'meet' | 'invite' | 'request' | 'info' | 'idea' | 'other';

/** 偶然への向き合い方。go=寄ってみる / hold=ひとまず保留 / pass=今回は見送る */
export type Choice = 'go' | 'hold' | 'pass';

/** 寄ってみた偶然の育ち具合 */
export type Stage = 'seed' | 'sprout' | 'flower' | 'fruit';

/** 稽古の手応え。good=うまくいった / soso=まあまあ / hard=むずかしかった */
export type Feel = 'good' | 'soso' | 'hard';

export interface Power {
  key: PowerKey;
  /** 一文字マーク */
  mark: string;
  name: string;
  /** 探検道具としての名前 */
  tool: string;
  /** ひとことで */
  short: string;
  /** なぜ偶然をつかむのに必要か */
  why: string;
  /** 鍛えるコツ */
  tip: string;
  /** 5分でできるお題 */
  drills: string[];
}

/** users/{uid}/chances/{id} 寄り道ログ（出会った偶然） */
export interface Chance {
  id: string;
  /** 出会った日 YYYY-MM-DD */
  date: string;
  kind: ChanceKind;
  /** どんな偶然だったか */
  title: string;
  choice: Choice;
  /** 保留の見直し日 YYYY-MM-DD（保留以外は空） */
  holdUntil: string;
  /** 寄ってみた偶然の育ち具合（寄ってみる以外は seed のまま） */
  stage: Stage;
  /** どの力で寄り道できたか／見送ったときに足りなかった力 */
  powers: PowerKey[];
  /** メモ（見送った理由など） */
  note: string;
  /** その後どうなったか */
  story: string;
  createdAt: number;
}

/** users/{uid}/practices/{id} 5つの力の稽古 */
export interface Practice {
  id: string;
  power: PowerKey;
  date: string;
  /** 取り組んだお題（自由記録なら空） */
  drill: string;
  result: string;
  feel: Feel;
  insight: string;
  createdAt: number;
}

/** あき枠の時間帯 */
export type SlotPart = 'am' | 'pm' | 'eve';

/** あき枠のふりかえり。chance=偶然が入った / rest=何も入らずゆっくり過ごした / filled=予定を入れてしまった */
export type SlotResult = 'chance' | 'rest' | 'filled';

/** users/{uid}/openSlots/{週の月曜日 YYYY-MM-DD} 週に1つだけ、予定を入れない枠 */
export interface OpenSlot {
  /** その週の月曜日（ドキュメントID） */
  week: string;
  /** 空けておく日 YYYY-MM-DD */
  date: string;
  part: SlotPart;
  /** まだふりかえっていなければ空 */
  result: SlotResult | '';
}

/** users/{uid}/assessments/{YYYY-MM} 月1回の自己チェック（各1〜5） */
export interface Assessment {
  month: string;
  scores: Record<PowerKey, number>;
  memo: string;
}
