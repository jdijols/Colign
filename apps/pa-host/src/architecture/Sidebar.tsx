import { NavLink } from "react-router-dom";
import { SECTIONS } from "./nav";

function ColignMark({ size = 16 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="2" rx="1" />
      <rect x="3" y="11" width="13" height="2" rx="1" />
      <rect x="3" y="17" width="8" height="2" rx="1" />
    </svg>
  );
}

export function Sidebar() {
  return (
    <aside className="arch-sidebar" aria-label="Architecture sections">
      <div className="arch-sidebar-brand">
        <ColignMark />
        <span>
          colign <span className="arch-sidebar-brand-tag">/ architecture</span>
        </span>
      </div>

      <div className="arch-sidebar-title">Onboarding</div>
      <nav className="arch-nav">
        {SECTIONS.map((s, i) => (
          <NavLink
            key={s.slug}
            to={s.path}
            end={s.path === "/architecture"}
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            <span className="arch-nav-num">{String(i + 1).padStart(2, "0")}</span>
            <span>{s.title}</span>
          </NavLink>
        ))}
      </nav>

      <div className="arch-sidebar-title">Resources</div>
      <nav className="arch-nav">
        <a href="/weekly-commit">
          <span className="arch-nav-num">→</span>
          <span>Open the app</span>
        </a>
        <a
          href="https://colign.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="arch-nav-num">↗</span>
          <span>colign.org</span>
        </a>
      </nav>
    </aside>
  );
}
