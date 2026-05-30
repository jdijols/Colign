import { type ReactNode } from "react";

type Tone = "info" | "warn" | "ok";

const ICON: Record<Tone, string> = {
  info: "ⓘ",
  warn: "▲",
  ok: "✓",
};

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: Tone;
  title: string;
  children: ReactNode;
}) {
  return (
    <aside className={`arch-callout arch-callout-${tone}`}>
      <div className="arch-callout-icon" aria-hidden>
        {ICON[tone]}
      </div>
      <div>
        <div className="arch-callout-title">{title}</div>
        <div>{children}</div>
      </div>
    </aside>
  );
}
