export interface ArchSection {
  slug: string;
  path: string;
  title: string;
  blurb: string;
}

export const SECTIONS: ArchSection[] = [
  {
    slug: "overview",
    path: "/architecture",
    title: "Overview",
    blurb: "What WC is and the three apps that make it up.",
  },
  {
    slug: "people",
    path: "/architecture/people",
    title: "People & Permissions",
    blurb: "Users, teams, managers, and who can see what.",
  },
  {
    slug: "data",
    path: "/architecture/data",
    title: "Data Model",
    blurb: "The RCDO hierarchy, Plan, WeeklyCommit, Reconciliation.",
  },
  {
    slug: "lifecycle",
    path: "/architecture/lifecycle",
    title: "The Weekly Lifecycle",
    blurb: "DRAFT → LOCKED → RECONCILING → RECONCILED → carry-forward.",
  },
  {
    slug: "routes",
    path: "/architecture/routes",
    title: "Routes & Screens",
    blurb: "What each screen does and the endpoints it talks to.",
  },
  {
    slug: "auth",
    path: "/architecture/auth",
    title: "Auth Flow",
    blurb: "How a JWT becomes a domain User.",
  },
  {
    slug: "stack",
    path: "/architecture/stack",
    title: "Stack & Module Federation",
    blurb: "How the host loads the remote, and why.",
  },
  {
    slug: "glossary",
    path: "/architecture/glossary",
    title: "Glossary & Where to Start",
    blurb: "Vocabulary plus good first-contribution ideas.",
  },
];

export function neighbors(slug: string) {
  const idx = SECTIONS.findIndex((s) => s.slug === slug);
  return {
    prev: idx > 0 ? SECTIONS[idx - 1] : undefined,
    next: idx >= 0 && idx < SECTIONS.length - 1 ? SECTIONS[idx + 1] : undefined,
  };
}

export function navLink(slug: string) {
  const s = SECTIONS.find((x) => x.slug === slug);
  if (!s) throw new Error(`Unknown architecture section: ${slug}`);
  return { to: s.path, title: s.title };
}
