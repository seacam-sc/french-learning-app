import { useEffect, useRef, useState } from 'preact/hooks';
import type { CheckResult, Question, Settings } from './engine';

type Mode = 'practice' | 'placement';

interface Props {
  q: Question;
  mode: Mode;
  settings: Settings;
  onCheck(answer: string, usedHint: boolean, tryNumber: number): CheckResult;
  onNext(): void;
  onAnother?(): void;
}

const CHOICE_FORMATS = ['mcq', 'reading_comprehension', 'listening_comprehension'];

export function QuestionCard({ q, mode, settings, onCheck, onNext, onAnother }: Props) {
  const practice = mode === 'practice';
  const hasChoices = CHOICE_FORMATS.includes(q.format) && !!q.choices && q.choices.length > 0;
  const hasTokens = q.format === 'sentence_order' && !!q.tokens && q.tokens.length > 0;

  const [text, setText] = useState('');
  const [choice, setChoice] = useState('');
  const [order, setOrder] = useState<number[]>([]);
  const [hintShown, setHintShown] = useState(practice && settings.autoHint);
  const [usedHint, setUsedHint] = useState(practice && settings.autoHint);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [tryNumber, setTryNumber] = useState(1);
  const [why, setWhy] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const firstBtnRef = useRef<HTMLButtonElement>(null);
  const checkRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const fbRef = useRef<HTMLDivElement>(null);
  const focusCheck = useRef(false);

  const answer = hasChoices ? choice : hasTokens ? order.map((i) => q.tokens![i]).join(' ') : text;
  const checked = result !== null;
  const correct = result?.outcome === 'correct';

  // Focus: the input on a new question or retry; feedback/Next after Check.
  useEffect(() => {
    if (!result) {
      (inputRef.current ?? firstBtnRef.current)?.focus();
    } else if (correct || !practice) {
      nextRef.current?.focus();
    } else {
      fbRef.current?.focus();
    }
  }, [result]);

  useEffect(() => {
    if (focusCheck.current && choice) { focusCheck.current = false; checkRef.current?.focus(); }
  }, [choice]);

  useEffect(() => {
    if (!hasChoices || checked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (document.querySelector('dialog[open]')) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= q.choices!.length) {
        focusCheck.current = true;
        setChoice(q.choices![n - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasChoices, checked, q]);

  const submit = (e: Event) => {
    e.preventDefault();
    if (checked || answer.trim() === '') return;
    setResult(onCheck(answer, usedHint, tryNumber));
  };

  const retry = () => {
    setTryNumber(tryNumber + 1);
    setText(''); setChoice(''); setOrder([]); setWhy(false);
    setResult(null);
  };

  const showHint = () => { setHintShown(true); setUsedHint(true); };

  const promptLang = q.format === 'translate_en_fr' ? 'en' : 'fr';
  const answerLang = q.format === 'translate_fr_en' ? 'en' : 'fr';
  const inputLang = answerLang;

  const verdict = result
    ? result.outcome === 'correct' ? 'Correct.' : result.outcome === 'near_miss' ? 'Almost — check the accents.' : 'Not quite.'
    : '';

  return (
    <section class="card" data-qid={q.id} aria-label="Question">
      {q.unverified && <p class="tag">Unverified</p>}
      {q.instruction && <p class="instruction">{q.instruction}</p>}
      {q.passage && <blockquote lang="fr" class="passage">{q.passage}</blockquote>}
      <p class="prompt" lang={promptLang} data-testid="prompt">{q.prompt}</p>

      <form onSubmit={submit}>
        {hasChoices && (
          <div class="choices" role="group" aria-label="Choices">
            {q.choices!.map((c, i) => (
              <button
                type="button"
                class="choice"
                lang={answerLang}
                ref={i === 0 ? firstBtnRef : undefined}
                aria-pressed={choice === c}
                disabled={checked}
                onClick={() => setChoice(c)}
              >
                <span class="num" aria-hidden="true">{i + 1}</span> {c}
              </button>
            ))}
          </div>
        )}

        {hasTokens && (
          <>
            <div class="answer-line" aria-label="Your answer" lang="fr">
              {order.length === 0 && <span class="muted">Tap the words in order.</span>}
              {order.map((ti, pos) => (
                <button type="button" class="token chosen" disabled={checked} onClick={() => setOrder(order.filter((_, p) => p !== pos))}>
                  {q.tokens![ti]}
                </button>
              ))}
            </div>
            <div class="tokens" lang="fr" role="group" aria-label="Words">
              {q.tokens!.map((t, i) => (
                <button
                  type="button"
                  class="token"
                  ref={i === 0 ? firstBtnRef : undefined}
                  disabled={checked || order.includes(i)}
                  onClick={() => setOrder([...order, i])}
                >
                  {t}
                </button>
              ))}
            </div>
            <div class="row">
              <button type="button" disabled={checked || order.length === 0} onClick={() => setOrder([])}>Clear</button>
            </div>
          </>
        )}

        {!hasChoices && !hasTokens && (
          <input
            ref={inputRef}
            type="text"
            class="text"
            lang={inputLang}
            aria-label="Your answer"
            autocomplete="off"
            autocapitalize="off"
            autocorrect="off"
            spellcheck={false}
            readOnly={checked}
            value={text}
            onInput={(e) => setText((e.target as HTMLInputElement).value)}
          />
        )}

        {hintShown && <p class="hint" data-testid="hint"><strong>Hint:</strong> {q.hint}</p>}

        {!checked && (
          <div class="row">
            <button type="submit" class="primary" ref={checkRef} disabled={answer.trim() === ''}>Check</button>
            {practice && !hintShown && <button type="button" onClick={showHint}>Hint</button>}
          </div>
        )}
      </form>

      {checked && (
        <div class="feedback" aria-live="polite" tabIndex={-1} ref={fbRef}>
          {practice ? (
            <>
              <p class="verdict">{verdict}</p>
              {!correct && (
                <p>Answer: <span lang={answerLang} class="accepted">{result!.matched ?? q.answer}</span></p>
              )}
              {!correct && result!.feedback && <p>{result!.feedback}</p>}
              {!correct && <p>{q.explanation}</p>}
              {correct && (
                <>
                  <button type="button" aria-expanded={why} onClick={() => setWhy(!why)}>Why?</button>
                  {why && <p>{q.explanation}</p>}
                </>
              )}
            </>
          ) : (
            <p class="verdict">Answer recorded.</p>
          )}
        </div>
      )}

      {checked && (
        <div class="row">
          {practice && !correct && <button type="button" onClick={retry}>Retry</button>}
          {practice && onAnother && <button type="button" onClick={onAnother}>Another example</button>}
          <button type="button" class="primary" ref={nextRef} onClick={onNext}>Next</button>
        </div>
      )}
    </section>
  );
}
