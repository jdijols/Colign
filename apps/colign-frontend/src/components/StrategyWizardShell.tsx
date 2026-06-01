import { HiArrowLeft, HiArrowRight, HiCheck } from "react-icons/hi";
import { ColignBrand } from "@/components/Brand";

const TOTAL_STEPS = 3;

/**
 * Full-screen centered card chrome shared by the three strategy onboarding
 * steps. Owns the "Step N of 3" indicator, headline/subhead, the single-input
 * form, and the Back / primary-CTA footer so each step page only supplies copy,
 * the controlled input, and submit/back handlers.
 */
export function StrategyWizardShell({
  step,
  headline,
  subhead,
  inputLabel,
  placeholder,
  value,
  onChange,
  onSubmit,
  ctaLabel,
  isSubmitting,
  error,
  onBack,
  maxLength = 200,
}: {
  step: 1 | 2 | 3;
  headline: string;
  subhead: string;
  inputLabel: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  ctaLabel: string;
  isSubmitting: boolean;
  error: string | null;
  onBack?: () => void;
  maxLength?: number;
}) {
  const canSubmit = value.trim().length > 0 && !isSubmitting;

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center text-neutral-900 dark:text-neutral-50">
          <ColignBrand size="lg" />
        </div>

        <StepIndicator step={step} />

        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 text-center">
          {headline}
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 text-center leading-relaxed">
          {subhead}
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) onSubmit();
          }}
          className="mt-8"
          aria-label={inputLabel}
        >
          <label htmlFor="strategy-node-input" className="sr-only">
            {inputLabel}
          </label>
          <input
            id="strategy-node-input"
            data-cy="strategy-node-input"
            type="text"
            // First input on a focused onboarding step — the user arrived here
            // specifically to name this node.
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={maxLength}
            placeholder={placeholder}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 text-base text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:border-transparent transition-shadow"
          />

          {error && (
            <p role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-400">
              {error}
            </p>
          )}

          <div className="mt-3 flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                data-cy="strategy-back"
                onClick={onBack}
                className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-50 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
              >
                <HiArrowLeft className="h-4 w-4" aria-hidden />
                Back
              </button>
            )}
            <button
              type="submit"
              data-cy="strategy-submit"
              disabled={!canSubmit}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-neutral-900 dark:bg-white px-4 py-3 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
            >
              {isSubmitting ? (
                "Saving…"
              ) : (
                <>
                  {ctaLabel}
                  <HiArrowRight className="h-4 w-4" aria-hidden />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div
      className="mt-8 flex items-center justify-center gap-2"
      aria-label={`Step ${step} of ${TOTAL_STEPS}`}
    >
      {Array.from({ length: TOTAL_STEPS }, (_, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <div key={n} className="flex items-center gap-2">
            <span
              className={
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors " +
                (active
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : done
                    ? "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200"
                    : "border border-neutral-300 text-neutral-400 dark:border-neutral-700 dark:text-neutral-600")
              }
            >
              {done ? <HiCheck className="h-3.5 w-3.5" aria-hidden /> : n}
            </span>
            {n < TOTAL_STEPS && (
              <span className="h-px w-6 bg-neutral-200 dark:bg-neutral-800" aria-hidden />
            )}
          </div>
        );
      })}
      <span className="sr-only">{`Step ${step} of ${TOTAL_STEPS}`}</span>
    </div>
  );
}
