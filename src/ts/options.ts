import { Chance, ChanceKind, Choice, Feel, Power, PowerKey, Practice, Stage } from './types';

/** 偶然をキャリアに変える5つの力（計画的偶発性理論） */
export const POWERS: Power[] = [
  {
    key: 'curiosity',
    mark: '好',
    name: '好奇心',
    tool: '虫めがね',
    short: '「おや？」に気づいて、近寄ってみる力',
    why: '偶然の機会は、たいてい「ちょっと気になる」の形でやってきます。気になったものを素通りしないことが、すべての寄り道の入り口です。',
    tip: '「知らない」「やったことがない」を見つけたら、1つだけ質問してみる。',
    drills: [
      'いつもと違う道で帰り、気になったものを1つ覚えておく',
      '普段は読まないジャンルの記事や本を1つ開いてみる',
      '若い人に「最近ハマっていること」を聞いて、1つ調べてみる',
      '知らない言葉を1つ見つけて、意味と由来を調べる',
      '行ったことのない店に入って、おすすめを聞いてみる',
      'AIに「自分が知らなそうな面白い分野」を3つ聞き、1つ深掘りする',
      '同僚や家族の仕事・趣味について、初めての質問を1つする',
      'ふだん通り過ぎている看板や張り紙を1つじっくり読む',
    ],
  },
  {
    key: 'persistence',
    mark: '続',
    name: '持続性',
    tool: '水筒',
    short: 'うまくいかなくても、もう一歩続ける力',
    why: '偶然の出会いが実を結ぶまでには時間がかかります。一度で終わらせず続けた人のところに、二度目・三度目の偶然が重なってきます。',
    tip: '「やめる前にあと1回」。続けるハードルを、思いきり小さくする。',
    drills: [
      '途中で止まっていることを1つ選び、5分だけ手をつける',
      '前に会った人に「その後どうですか」と連絡してみる',
      '続けていることの記録を見返し、ここまでの自分をほめる',
      '断られたこと・失敗したことに、やり方を変えてもう一度挑む',
      '毎日続けたい小さな行動を1つ決めて、今日やる',
      '一度読んでやめた本の続きを、10ページだけ読む',
      'うまくいかなかった理由を1つ書き、次の一手を決める',
      '「三日坊主でもいい」と決めて、新しいことを3日だけ続けてみる',
    ],
  },
  {
    key: 'optimism',
    mark: '楽',
    name: '楽観性',
    tool: '晴れの帽子',
    short: '「なんとかなる」「きっと面白くなる」と思える力',
    why: '思いがけない出来事を「困ったこと」ではなく「チャンスかも」と受け取れる人ほど、偶然を味方につけられます。',
    tip: '悪い出来事にも「この経験で得たものは？」と一度だけ問いかける。',
    drills: [
      '今日のちょっとした失敗を、良い面から一言で言い直す',
      '寝る前に「今日よかったこと」を3つ書き出す',
      '心配ごとを1つ書き、「最悪でもこうなるだけ」と言葉にしてみる',
      '思いどおりにいかなかったことに「おかげで〜できた」を探す',
      '会った人に、相手の良いところを1つ伝える',
      '「どうせ無理」と思った瞬間に「もしできたら？」と考え直す',
      '昔の苦労が今に生きている例を1つ思い出して書く',
      '明日の楽しみを1つ決めて、予定に入れる',
    ],
  },
  {
    key: 'flexibility',
    mark: '柔',
    name: '柔軟性',
    tool: '地図とコンパス',
    short: '予定が変わっても、こだわりを手放して向きを変える力',
    why: '「自分はこういう人間だ」「この道しかない」と決めつけると、横から来た機会に気づけません。予定外を受け入れる余白が、偶然の入り口になります。',
    tip: '「いつものやり方」を1つ選んで、今日だけ変えてみる。',
    drills: [
      'いつもの手順を1つ、別のやり方で試してみる',
      '自分と違う意見の人の考えを「なるほど」と一度受け止める',
      '予定が変わったとき、新しい予定の良いところを1つ探す',
      '「自分には向いていない」と思っていたことを、少しだけやってみる',
      '若い人に、仕事や道具のやり方を教えてもらう',
      'いつもと違う席・時間・場所で作業してみる',
      '昔決めた「マイルール」を1つ見直して、今の自分に合うか考える',
      '頼まれたことを「できない」ではなく「こうならできる」で返す',
    ],
  },
  {
    key: 'adventure',
    mark: '冒',
    name: '冒険心',
    tool: 'リュック',
    short: '結果がわからなくても、一歩踏み出す力',
    why: '偶然は、行動した人の前にしか現れません。うまくいくかわからないことに手を挙げた回数が、出会える機会の数を増やします。',
    tip: '「失敗しても失うものは小さい」と確かめてから、軽く踏み出す。',
    drills: [
      '迷っている誘いに、今日「行きます」と返事をする',
      '会議や集まりで、最初に手を挙げて発言する',
      '一度も話したことのない人に、自分から声をかける',
      '気になっていた講座・イベントを1つ探して申し込む',
      '自分の経験やノウハウを、誰かに小さく発信してみる',
      'やったことのない料理・道具・アプリを1つ試す',
      '「いつかやりたい」ことの最初の一歩を、今日5分だけやる',
      '頼まれごとを、少しだけ背伸びして引き受けてみる',
    ],
  },
];

export const POWER_KEYS: PowerKey[] = POWERS.map((p) => p.key);

export function powerOf(key: PowerKey): Power {
  return POWERS.find((p) => p.key === key) ?? POWERS[0];
}

export const KINDS: { key: ChanceKind; label: string; hint: string }[] = [
  { key: 'meet', label: '出会い', hint: '人との出会い・再会' },
  { key: 'invite', label: '誘い', hint: 'イベント・飲み会・集まり' },
  { key: 'request', label: '頼まれごと', hint: '役割・相談・お願い' },
  { key: 'info', label: '情報', hint: '記事・募集・うわさ' },
  { key: 'idea', label: '思いつき', hint: 'ふと気になったこと' },
  { key: 'other', label: 'その他', hint: '' },
];

export function kindLabel(key: ChanceKind): string {
  return KINDS.find((k) => k.key === key)?.label ?? 'その他';
}

export const CHOICES: { key: Choice; label: string; desc: string }[] = [
  { key: 'go', label: '寄ってみる', desc: '乗ってみる' },
  { key: 'hold', label: '保留', desc: 'あとで決める' },
  { key: 'pass', label: '見送る', desc: '記録だけ残す' },
];

export const CHOICE_LABEL: Record<Choice, string> = {
  go: '寄ってみた',
  hold: '保留中',
  pass: '見送った',
};

export const STAGES: { key: Stage; label: string; desc: string }[] = [
  { key: 'seed', label: '種', desc: '寄ってみた' },
  { key: 'sprout', label: '芽', desc: '何かが動き出した' },
  { key: 'flower', label: '花', desc: '手応え・つながりが生まれた' },
  { key: 'fruit', label: '実', desc: '人生や仕事に実った' },
];

export function stageIndex(s: Stage): number {
  return STAGES.findIndex((x) => x.key === s);
}

/** 保留の見直しまでの日数の選択肢 */
export const HOLD_DAYS: { days: number; label: string }[] = [
  { days: 3, label: '3日後' },
  { days: 7, label: '1週間後' },
  { days: 14, label: '2週間後' },
  { days: 30, label: '1か月後' },
];

export const FEELS: { key: Feel; label: string; desc: string }[] = [
  { key: 'good', label: 'うまくいった', desc: '手応えあり' },
  { key: 'soso', label: 'まあまあ', desc: '少しできた' },
  { key: 'hard', label: 'むずかしかった', desc: '次につなげる' },
];

export const FEEL_LABEL: Record<Feel, string> = {
  good: 'うまくいった',
  soso: 'まあまあ',
  hard: 'むずかしかった',
};

/** 自己チェックの5段階 */
export const SCORE_LEVELS: { value: number; label: string }[] = [
  { value: 1, label: 'ほとんどない' },
  { value: 2, label: 'ときどき' },
  { value: 3, label: '意識すればできる' },
  { value: 4, label: '自然にできる' },
  { value: 5, label: 'いつでも発揮できる' },
];

/** 経験値 */
export const XP_PRACTICE = 10;
export const XP_INSIGHT = 5;
export const XP_CHANCE = 5;
export const XP_GO = 5;
export const XP_STAGE: Record<Stage, number> = { seed: 0, sprout: 5, flower: 15, fruit: 35 };

export function practiceXp(p: Pick<Practice, 'insight'>): number {
  return XP_PRACTICE + (p.insight.trim() ? XP_INSIGHT : 0);
}

export function chanceXp(c: Pick<Chance, 'choice' | 'stage'>): number {
  let xp = XP_CHANCE;
  if (c.choice === 'go') xp += XP_GO + XP_STAGE[c.stage];
  return xp;
}

/** 力ごとのレベル（30XPごとに1つ上がる） */
export const XP_PER_LEVEL = 30;

/** 累計経験値に応じた隊員の階級 */
export const TITLES: { min: number; name: string }[] = [
  { min: 0, name: '見習い隊員' },
  { min: 30, name: '隊員' },
  { min: 100, name: '先導隊員' },
  { min: 250, name: '副隊長' },
  { min: 500, name: '隊長' },
  { min: 1000, name: '探検家' },
  { min: 2000, name: '伝説の探検家' },
];
