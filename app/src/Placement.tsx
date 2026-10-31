import { useState } from 'preact/hooks';
import { checkAnswer, diagnosticProfile, nextDiagnosticQuestion, recordDiagnosticAnswer, startDiagnostic } from './engine';
import type { DiagState, Question } from './engine';
import type { Ctx } from './ctx';
import { QuestionCard } from './QuestionCard';
import { DOMAIN_NAMES } from './labels';

function asDiag(v: unknown): DiagState | null {
  const d = v as Partial<DiagState> | undefined;
  return d && Array.isArray(d.domains) && Array.isArray(d.asked) && d.per && d.pool ? (d as DiagState) : null;
}

export function Placement({ ctx }: { ctx: Ctx }) {
  const { bank } = ctx;
  const [diag, setDiag] = useState<DiagState | null>(() => asDiag(ctx.snap.diagnostic));
  const [q, setQ] = useState<Question | null>(() => {
    const d = asDiag(ctx.snap.diagnostic);
    return d ? nextDiagnosticQuestion(bank, d) : null;
  });
  const [n, setN] = useState(() => (asDiag(ctx.snap.diagnostic)?.asked.length ?? 0) + 1);
  const [nonce, setNonce] = useState(0);

  const begin = () => {
    const d = startDiagnostic(bank);
    ctx.setDiagnostic(d);
    setDiag(d);
    setQ(nextDiagnosticQuestion(bank, d));
    setN(1);
    setNonce(nonce + 1);
  };

  if (!diag) {
    return (
      <>
        <h1>Placement check</h1>
        <p>A short set of questions, with no hints. The result is provisional.</p>
        <div class="row"><button type="button" class="primary" onClick={begin}>Start</button></div>
      </>
    );
  }

  if (!q) {
    const profile = diagnosticProfile(diag);
    return (
      <>
        <h1>Placement result</h1>
        <ul class="plain">
          {diag.domains.map((d) => (
            <li class="obj">
              <h3>{DOMAIN_NAMES[d] ?? d}</h3>
              <dl class="facts">
                <dt>Estimate</dt><dd>{profile[d].estimate ?? 'Not enough answers'}</dd>
                <dt>Questions</dt><dd>{profile[d].answered}</dd>
              </dl>
            </li>
          ))}
        </ul>
        <p class="muted">Provisional. Based on a small number of questions. It is not a CEFR certificate.</p>
        <div class="row">
          <button type="button" onClick={begin}>Start again</button>
          <a class="btn" href="#/practice">Back to practice</a>
        </div>
      </>
    );
  }

  const onCheck = (answer: string) => {
    const res = checkAnswer(q, answer, ctx.getSnap().settings);
    const next = recordDiagnosticAnswer(diag, q, res.outcome);
    ctx.setDiagnostic(next);
    setDiag(next);
    return res;
  };

  const onNext = () => {
    setQ(nextDiagnosticQuestion(bank, diag));
    setN(n + 1);
    setNonce(nonce + 1);
  };

  return (
    <>
      <h1>Question {n}</h1>
      <QuestionCard key={`${q.id}-${nonce}`} q={q} mode="placement" settings={ctx.snap.settings} onCheck={onCheck} onNext={onNext} />
    </>
  );
}
