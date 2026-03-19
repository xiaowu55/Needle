"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildCustomAlbumsFromDrafts,
  clearCustomLibrary,
  DEFAULT_RECOMMENDATION_SETTINGS,
  normalizeImportedAlbums,
  parseRecommendationCookieValue,
  readCustomLibrary,
  readRecommendationHistory,
  readRecommendationSettings,
  removeCustomAlbum,
  resolveCustomRecommendation,
  type CustomAlbum,
  type CustomRecommendationSnapshot,
  type ImportNormalizationResult,
  type RecommendationHistory,
  type RecommendationSettings,
  CUSTOM_RECOMMENDATION_COOKIE,
  writeCustomLibrary,
  writeRecommendationHistory,
  writeRecommendationSettings,
} from "@/lib/custom-library";

type CustomLibrarySettingsProps = {
  timeZone: string;
};

function writeSnapshotCookie(snapshot: CustomRecommendationSnapshot | null) {
  if (typeof document === "undefined") {
    return;
  }

  if (!snapshot) {
    document.cookie = `${CUSTOM_RECOMMENDATION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }

  document.cookie = `${CUSTOM_RECOMMENDATION_COOKIE}=${encodeURIComponent(JSON.stringify(snapshot))}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function CustomLibrarySettings({ timeZone }: CustomLibrarySettingsProps) {
  const [rawText, setRawText] = useState("");
  const [preview, setPreview] = useState<ImportNormalizationResult>({
    drafts: [],
    rejected: [],
  });
  const [library, setLibrary] = useState<CustomAlbum[]>([]);
  const [settings, setSettings] = useState<RecommendationSettings>(
    DEFAULT_RECOMMENDATION_SETTINGS,
  );
  const [history, setHistory] = useState<RecommendationHistory>({
    assignments: {},
    cycleSeenIds: [],
    updatedAt: "",
  });
  const [currentSnapshot, setCurrentSnapshot] = useState<CustomRecommendationSnapshot | null>(null);
  const [status, setStatus] = useState("你可以粘贴多行文本导入自己的专辑库。");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const nextLibrary = readCustomLibrary();
    const nextSettings = readRecommendationSettings();
    const nextHistory = readRecommendationHistory();
    const cookieValue = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${CUSTOM_RECOMMENDATION_COOKIE}=`))
      ?.slice(CUSTOM_RECOMMENDATION_COOKIE.length + 1);

    setLibrary(nextLibrary);
    setSettings(nextSettings);
    setHistory(nextHistory);
    setCurrentSnapshot(parseRecommendationCookieValue(cookieValue));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const nextSettings =
      library.length === 0 && settings.source === "custom"
        ? { ...settings, source: "default" as const }
        : settings;

    if (nextSettings !== settings) {
      setSettings(nextSettings);
      return;
    }

    writeCustomLibrary(library);
    writeRecommendationSettings(nextSettings);

    const nextResolved = resolveCustomRecommendation({
      library,
      settings: nextSettings,
      history,
      timeZone,
    });

    const currentHistoryJson = JSON.stringify(history);
    const nextHistoryJson = JSON.stringify(nextResolved.history);

    if (currentHistoryJson !== nextHistoryJson) {
      setHistory(nextResolved.history);
    }

    writeRecommendationHistory(nextResolved.history);
    writeSnapshotCookie(nextResolved.snapshot);
    setCurrentSnapshot(nextResolved.snapshot);
  }, [hydrated, history, library, settings, timeZone]);

  const recommendationSummary = useMemo(() => {
    if (!currentSnapshot) {
      return "当前仍按默认 Rolling Stone 榜单逻辑推荐。";
    }

    return `当前自定义推荐：${currentSnapshot.album.artist} - ${currentSnapshot.album.album}`;
  }, [currentSnapshot]);

  function analyzeImport() {
    const nextPreview = normalizeImportedAlbums(rawText);
    setPreview(nextPreview);

    if (nextPreview.drafts.length === 0) {
      setStatus("没有识别出可导入的专辑，请调整文本格式。");
      return;
    }

    setStatus(
      `识别到 ${nextPreview.drafts.length} 条可导入记录，${nextPreview.rejected.length} 条需要人工确认。`,
    );
  }

  function importPreview() {
    const imported = buildCustomAlbumsFromDrafts(preview.drafts, library);

    if (imported.length === 0) {
      setStatus("没有新的可导入专辑，可能与现有库重复。");
      return;
    }

    const nextLibrary = [...library, ...imported];
    setLibrary(nextLibrary);
    setRawText("");
    setPreview({
      drafts: [],
      rejected: [],
    });
    setStatus(`已导入 ${imported.length} 张专辑。`);
  }

  function removeAlbum(albumId: string) {
    const nextLibrary = removeCustomAlbum(albumId);
    setLibrary(nextLibrary);
    setStatus("已移除这张专辑。");
  }

  function clearLibrary() {
    clearCustomLibrary();
    setLibrary([]);
    setHistory({
      assignments: {},
      cycleSeenIds: [],
      updatedAt: "",
    });
    writeRecommendationHistory({
      assignments: {},
      cycleSeenIds: [],
      updatedAt: "",
    });
    writeSnapshotCookie(null);
    setCurrentSnapshot(null);
    setStatus("已清空自定义专辑库。");
  }

  return (
    <section className="push-panel">
      <div className="push-panel-copy">
        <p className="editor-kicker">Custom Library</p>
        <h2 className="push-panel-title">导入自己的专辑</h2>
        <p className="push-panel-text">
          粘贴多行文本，先用规则解析成结构化专辑，再保存到当前浏览器的自定义库。
        </p>
      </div>

      <label className="push-field">
        <span>导入文本</span>
        <textarea
          className="editor-textarea"
          rows={8}
          placeholder={"Radiohead - OK Computer\nBeyonce / Lemonade / 2016\nMiles Davis - Kind of Blue"}
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
        />
      </label>

      <div className="poster-actions push-actions">
        <button type="button" className="editor-button editor-button-dark" onClick={analyzeImport}>
          整理格式
        </button>
        {preview.drafts.length > 0 ? (
          <button type="button" className="editor-button" onClick={importPreview}>
            导入识别结果
          </button>
        ) : null}
      </div>

      {preview.drafts.length > 0 || preview.rejected.length > 0 ? (
        <div className="library-preview">
          <div className="push-panel-copy">
            <p className="editor-kicker">Preview</p>
            <h3 className="library-section-title">导入预览</h3>
          </div>

          {preview.drafts.length > 0 ? (
            <div className="library-preview-stack">
              {preview.drafts.map((draft, index) => (
                <div className="library-preview-item" key={`${draft.artist}-${draft.album}-${index}`}>
                  <strong>
                    {draft.artist} - {draft.album}
                  </strong>
                  <span>
                    {draft.year ? `${draft.year}` : "年份可留空"}
                    {draft.notes ? ` · ${draft.notes}` : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {preview.rejected.length > 0 ? (
            <div className="library-preview-rejected">
              <p className="push-panel-status">以下文本需要人工调整：</p>
              {preview.rejected.map((item) => (
                <div className="library-preview-item rejected" key={item.sourceText}>
                  <strong>{item.sourceText}</strong>
                  <span>{item.reason}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="push-panel-copy">
        <p className="editor-kicker">Recommendation</p>
        <h3 className="library-section-title">每日推荐规则</h3>
        <p className="push-panel-status">{recommendationSummary}</p>
      </div>

      <div className="push-grid">
        <label className="push-field">
          <span>推荐来源</span>
          <select
            value={settings.source}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                source: event.target.value as RecommendationSettings["source"],
              }))
            }
            disabled={library.length === 0}
          >
            <option value="default">默认榜单</option>
            <option value="custom">自定义专辑库</option>
          </select>
        </label>

        <label className="push-field">
          <span>推荐方式</span>
          <select
            value={settings.mode}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                mode: event.target.value as RecommendationSettings["mode"],
              }))
            }
          >
            <option value="random">随机推荐</option>
            <option value="list_order">按导入顺序</option>
          </select>
        </label>

        <label className="push-field">
          <span>重复策略</span>
          <select
            value={settings.allowRepeat ? "allow" : "cycle_once"}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                allowRepeat: event.target.value === "allow",
              }))
            }
          >
            <option value="cycle_once">不重复，直到全部轮完</option>
            <option value="allow">允许重复</option>
          </select>
        </label>
      </div>

      <section className="library-list-block">
        <div className="push-panel-copy">
          <p className="editor-kicker">Library</p>
          <h3 className="library-section-title">当前自定义专辑库</h3>
          <p className="push-panel-status">已保存 {library.length} 张专辑。</p>
        </div>

        {library.length === 0 ? (
          <p className="push-panel-status">当前还没有导入任何自定义专辑。</p>
        ) : (
          <div className="library-list">
            {library.map((album) => (
              <div className="library-item" key={album.id}>
                <div className="library-item-copy">
                  <strong>
                    {album.artist} - {album.album}
                  </strong>
                  <span>
                    {album.year ? `${album.year}` : "年份未填写"}
                    {album.notes ? ` · ${album.notes}` : ""}
                  </span>
                </div>

                <button
                  type="button"
                  className="editor-button library-item-button"
                  onClick={() => removeAlbum(album.id)}
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        )}

        {library.length > 0 ? (
          <div className="poster-actions push-actions">
            <button type="button" className="editor-button" onClick={clearLibrary}>
              清空自定义库
            </button>
          </div>
        ) : null}
      </section>

      <p className="push-panel-status">{status}</p>
    </section>
  );
}
