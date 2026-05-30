import { useEffect, useId, useRef, useState } from "react";

let mermaidInitPromise: Promise<typeof import("mermaid").default> | null = null;

function loadMermaid() {
  if (!mermaidInitPromise) {
    mermaidInitPromise = import("mermaid").then((m) => {
      const isDark =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-color-scheme: dark)").matches;
      m.default.initialize({
        startOnLoad: false,
        theme: isDark ? "dark" : "default",
        themeVariables: {
          fontFamily:
            'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          fontSize: "14px",
        },
        flowchart: { htmlLabels: true, curve: "basis" },
        sequence: { actorMargin: 50, boxMargin: 10 },
        er: { useMaxWidth: true },
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
