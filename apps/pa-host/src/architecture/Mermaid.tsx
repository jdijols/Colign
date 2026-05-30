import { useEffect, useId, useRef, useState } from "react";

let mermaidInitPromise: Promise<typeof import("mermaid").default> | null = null;

function loadMermaid() {
  if (!mermaidInitPromise) {
    mermaidInitPromise = import("mermaid").then((m) => {
      const isDark =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-color-scheme: dark)").matches;

      // Tuned to match the colign aesthetic: monochromatic, weight 500-600,
      // light borders, no heavy fills. Lives outside the .arch-site cascade
      // because mermaid renders to inline SVG with its own theme vars.
      const palette = isDark
        ? {
            fg: "#f1f5f9",
            muted: "#94a3b8",
            border: "#1f2937",
            surface: "#0b1220",
            bg: "#030712",
            soft: "rgba(226, 232, 240, 0.06)",
          }
        : {
            fg: "#0f172a",
            muted: "#64748b",
            border: "#e5e7eb",
            surface: "#ffffff",
            bg: "#f9fafb",
            soft: "rgba(15, 23, 42, 0.04)",
          };

      m.default.initialize({
        startOnLoad: false,
        theme: "base",
        themeVariables: {
          fontFamily:
            'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          fontSize: "13px",
          primaryColor: palette.surface,
          primaryTextColor: palette.fg,
          primaryBorderColor: palette.border,
          lineColor: palette.muted,
          secondaryColor: palette.soft,
          tertiaryColor: palette.bg,
          background: palette.surface,
          mainBkg: palette.surface,
          secondBkg: palette.soft,
          tertiaryBkg: palette.bg,
          nodeBorder: palette.border,
          clusterBkg: palette.bg,
          clusterBorder: palette.border,
          edgeLabelBackground: palette.bg,
          // sequence diagram
          actorBkg: palette.surface,
          actorBorder: palette.border,
          actorTextColor: palette.fg,
          actorLineColor: palette.muted,
          signalColor: palette.fg,
          signalTextColor: palette.fg,
          labelBoxBkgColor: palette.soft,
          labelBoxBorderColor: palette.border,
          labelTextColor: palette.fg,
          loopTextColor: palette.fg,
          noteBkgColor: palette.soft,
          noteBorderColor: palette.border,
          noteTextColor: palette.fg,
          // state diagram
          labelColor: palette.fg,
          // ER diagram
          relationLabelBackground: palette.bg,
          relationLabelColor: palette.fg,
        },
        flowchart: { htmlLabels: true, curve: "basis", padding: 12 },
        sequence: { actorMargin: 56, boxMargin: 12, messageMargin: 36 },
        er: { useMaxWidth: true },
        state: { useMaxWidth: true },
      });
      return m.default;
    });
  }
  return mermaidInitPromise;
}

export function Mermaid({ chart, caption }: { chart: string; caption?: string }) {
  const reactId = useId();
  const id = `m${reactId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMermaid().then(async (mermaid) => {
      if (cancelled || !ref.current) return;
      try {
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  return (
    <figure className="arch-diagram">
      <div ref={ref} />
      {error && (
        <pre style={{ color: "crimson", fontSize: 12, whiteSpace: "pre-wrap" }}>
          Mermaid render error: {error}
        </pre>
      )}
      {caption && <figcaption className="arch-diagram-caption">{caption}</figcaption>}
    </figure>
  );
}
