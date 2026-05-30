import { NavLink } from "react-router-dom";
import { SECTIONS } from "./nav";

export function Sidebar() {
  return (
    <aside className="arch-sidebar" aria-label="Architecture sections">
      <div className="arch-sidebar-title">Onboarding</div>
      <nav className="arch-nav">
        {SECTIONS.map((s, i) => (
          <NavLink
            key={s.slug}
            to={s.path}
            end={s.path === "/architecture"}
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            <span className="arch-nav-num">{i + 1}</span>
            <span>{s.title}</span>
          </NavLink>
        ))}
      </nav>
      <div className="arch-sidebar-title">Resources</div>
      <nav className="arch-nav">
        <a href="/weekly-commit" target="_self">
          <span className="arch-nav-num">→</span>
          <span>Open the WC app</span>
        </a>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.preventDefault()}
          style={{ opacity: 0.5, cursor: "default" }}
          title="Source links land in a follow-up"
        >
          <span className="arch-nav-num">⤴</span>
          <span>View source (soon)</span>
        </a>
      </nav>
    </aside>
  );
}
