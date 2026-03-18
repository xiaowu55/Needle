"use client";

type ShareButtonProps = {
  title: string;
  text: string;
  url: string;
};

export function ShareButton({ title, text, url }: ShareButtonProps) {
  async function onShare() {
    const shareUrl =
      typeof window !== "undefined" && url.startsWith("/")
        ? `${window.location.origin}${url}`
        : url;

    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title, text, url: shareUrl });
      return;
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      window.alert("链接已复制");
    }
  }

  return (
    <button type="button" className="editor-button" onClick={onShare}>
      分享
    </button>
  );
}
