import { Link } from "react-router-dom";

interface Nav {
  to: string;
  title: string;
}

export function PageFooter({ prev, next }: { prev?: Nav; next?: Nav }) {
  return (
    <nav className="arch-pagefoot" aria-label="Page navigation">
      {prev ? (
        <Link to={prev.to}>
          <div className="arch-pagefoot-dir">← Previous</div>
          <div className="arch-pagefoot-title">{prev.title}</div>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link to={next.to}>
          <div className="arch-pagefoot-dir">Next →</div>
          <div className="arch-pagefoot-title">{next.title}</div>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
