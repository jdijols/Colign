export function FileRef({ path, line }: { path: string; line?: number }) {
  return (
    <span className="arch-fileref" title="Source file in the WC repo">
      <svg
        className="arch-fileref-icon"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M9 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6L9 1Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path d="M9 1v5h5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
      {path}
      {line != null ? `:${line}` : ""}
    </span>
  );
}
