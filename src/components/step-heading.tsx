export function StepHeading({
  step,
  title,
  note,
}: {
  step: string;
  title: string;
  note?: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="tnum font-mono text-[0.68rem] font-bold text-magenta">{step}</span>
      <h2 className="font-display text-[0.82rem] font-bold uppercase tracking-[0.14em]">
        {title}
      </h2>
      <span aria-hidden className="h-px flex-1 bg-rule-firm" />
      {note ? <span className="label-eyebrow text-ink-45">{note}</span> : null}
    </div>
  );
}
