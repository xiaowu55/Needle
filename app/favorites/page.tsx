import Link from "next/link";
import { FavoritesLink } from "@/components/favorites-link";
import { FavoritesPageClient } from "@/components/favorites-page-client";
import { SettingsLink } from "@/components/settings-link";

export const dynamic = "force-dynamic";

export default function FavoritesPage() {
  return (
    <main className="editor-shell">
      <section className="editor-page favorites-page">
        <div className="editor-header">
          <div className="header-links">
            <Link href="/" className="editor-link">
              今日专辑
            </Link>
            <FavoritesLink />
            <SettingsLink />
          </div>
        </div>

        <FavoritesPageClient />
      </section>
    </main>
  );
}
