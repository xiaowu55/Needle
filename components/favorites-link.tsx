import Link from "next/link";

type FavoritesLinkProps = {
  className?: string;
};

export function FavoritesLink({ className }: FavoritesLinkProps) {
  return (
    <Link
      href="/favorites"
      className={`editor-link editor-icon-link${className ? ` ${className}` : ""}`}
      aria-label="收藏夹"
      title="收藏夹"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="editor-icon"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1Z" />
      </svg>
      <span className="editor-link-label">收藏夹</span>
    </Link>
  );
}
