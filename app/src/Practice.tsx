import { useEffect, useRef, useState } from 'preact/hooks';
import { anotherExample, checkAnswer, selectNext, updateCard } from './engine';
import type { Attempt, Question } from './engine';
import type { Ctx } from './ctx';
import { QuestionCard } from './QuestionCard';
import { Glossary } from './Glossary';
import { matchesTopic, topicLabel } from './labels';

export function Practice({ ctx }: { ctx: Ctx }) {
  const { bank } = ctx;
  const topic = ctx.snap.session.topic;
  const recent = useRef<string[]>([]);
  const [nonce, setNonce] = useState(0);
  const [glossary, setGlossary] = useState(false);
  const [q, setQ] = useState<Question | null>(() => {
    const s = ctx.getSnap();
    const cur = s.session.currentQuestionId;
    const found = cur ? bank.questions.find((x) => x.id === cur) : undefined;
    if (found && matchesTopic(bank, found, s.session.topic)) return found;
    return selectNext(bank, s, new Date(), s.session.topic, []);
  });

  useEffect(() => {
    if (q && q.id !== ctx.getSnap().session.currentQuestionId) ctx.patchSession({ currentQuestionId: q.id });
  }, [q?.id]);

  if (!q) {
    return (
      <>
        <p>No questions in this topic.</p>
        <p><a href="#/topics">Change topic</a></p>
      </>
    );
  }

  const move = (next: Question | null) => {
    if (!next) return;
    recent.current = [q.id, ...recent.current].slice(0, 5);
    setQ(next);
    setNonce(nonce + 1);
  };

  const onCheck = (answer: string, usedHint: boolean, tryNumber: number) => {
    const s = ctx.getSnap();
    const res = checkAnswer(q, answer, s.settings);
    const now = new Date();
    const attempt: Attempt = {
      questionId: q.id,
      objectiveId: q.objective_id,
      variantGroup: q.variant_group ?? q.id,
      at: now.toISOString(),
      answer,
      outcome: res.outcome,
      usedHint,
      tryNumber,
    };
    ctx.record(attempt, updateCard(s.cards[q.id], attempt, now));
    return res;
  };

  const another = anotherExample(bank, q, ctx.getSnap(), recent.current);

  return (
    <>
      <div class="topbar">
        <p class="topic">Topic: <strong>{topicLabel(bank, topic)}</strong> <a href="#/topics">Change</a></p>
        <button type="button" onClick={() => setGlossary(true)}>Glossary</button>
      </div>
      <QuestionCard
        key={`${q.id}-${nonce}`}
        q={q}
        mode="practice"
        settings={ctx.snap.settings}
        onCheck={onCheck}
        onAnother={another ? () => move(another) : undefined}
        onNext={() => move(selectNext(bank, ctx.getSnap(), new Date(), topic, [q.id, ...recent.current].slice(0, 5)))}
      />
      {glossary && <Glossary bank={bank} onClose={() => setGlossary(false)} />}
    </>
  );
}
