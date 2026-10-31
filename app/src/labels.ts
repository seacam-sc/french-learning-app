import type { Bank, Question, Stage, Topic } from './engine';

export const DOMAIN_NAMES: Record<string, string> = {
  GRM: 'Grammar and sentence building',
  VOC: 'Vocabulary',
  REA: 'Reading',
  LIS: 'Listening',
  WRI: 'Writing',
  SPK: 'Speaking',
  PRA: 'Practical situations',
  ADV: 'Advanced communication',
};

export const STAGE_NAMES: Record<Stage, string> = {
  new: 'Not started',
  exposure: 'Seen',
  guided: 'Right with help',
  independent: 'Right on your own',
  retained: 'Remembered later',
};

export function matchesTopic(bank: Bank, q: Question, topic: Topic): boolean {
  if (!topic) return true;
  if (q.objective_id === topic || q.level === topic) return true;
  return bank.objectives.find((o) => o.id === q.objective_id)?.domain === topic;
}

export function topicLabel(bank: Bank, topic: Topic): string {
  if (!topic) return 'Automatic';
  if (/^[AB][12]$/.test(topic)) return `Level ${topic}`;
  if (DOMAIN_NAMES[topic]) return DOMAIN_NAMES[topic];
  return bank.objectives.find((o) => o.id === topic)?.skill ?? 'Automatic';
}

export function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
