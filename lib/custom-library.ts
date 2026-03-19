export const CUSTOM_LIBRARY_STORAGE_KEY = "album-daily:custom-library";
export const RECOMMENDATION_SETTINGS_STORAGE_KEY = "album-daily:recommendation-settings";
export const RECOMMENDATION_HISTORY_STORAGE_KEY = "album-daily:recommendation-history";
export const CUSTOM_RECOMMENDATION_COOKIE = "album_daily_custom_pick";
export const CUSTOM_LIBRARY_EVENT = "album-daily:custom-library-change";
export const RECOMMENDATION_SETTINGS_EVENT = "album-daily:recommendation-settings-change";
export const RECOMMENDATION_HISTORY_EVENT = "album-daily:recommendation-history-change";

export type CustomAlbum = {
  id: string;
  artist: string;
  album: string;
  year?: number;
  notes?: string;
  sourceText: string;
  createdAt: string;
};

export type ImportedAlbumDraft = {
  artist: string;
  album: string;
  year?: number;
  notes?: string;
  sourceText: string;
};

export type ImportRejectedLine = {
  sourceText: string;
  reason: string;
};

export type ImportNormalizationResult = {
  drafts: ImportedAlbumDraft[];
  rejected: ImportRejectedLine[];
};

export type RecommendationSettings = {
  source: "default" | "custom";
  mode: "random" | "list_order";
  allowRepeat: boolean;
  repeatPolicy: "cycle_once";
};

export type RecommendationHistory = {
  assignments: Record<string, string>;
  cycleSeenIds: string[];
  updatedAt: string;
};

export type CustomRecommendationSnapshot = {
  source: "custom";
  dateKey: string;
  album: CustomAlbum;
  settings: RecommendationSettings;
};

export const DEFAULT_RECOMMENDATION_SETTINGS: RecommendationSettings = {
  source: "default",
  mode: "random",
  allowRepeat: false,
  repeatPolicy: "cycle_once",
};

const DEFAULT_RECOMMENDATION_HISTORY: RecommendationHistory = {
  assignments: {},
  cycleSeenIds: [],
  updatedAt: "",
};

function getDateKey(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function hashDateKey(dateKey: string) {
  return dateKey.split("-").reduce((sum, part) => sum + Number(part), 0);
}

function normalizeIdentity(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getAlbumKey(parts: Pick<CustomAlbum, "artist" | "album" | "year">) {
  return `${normalizeIdentity(parts.artist)}::${normalizeIdentity(parts.album)}::${parts.year ?? ""}`;
}

function pruneAssignments(
  assignments: Record<string, string>,
  maxEntries = 400,
) {
  const entries = Object.entries(assignments).sort(([a], [b]) => a.localeCompare(b));
  const trimmed = entries.slice(-maxEntries);
  return Object.fromEntries(trimmed);
}

function readJsonStorage<T>(key: string, fallback: T) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const value = window.localStorage.getItem(key);

    if (!value) {
      return fallback;
    }

    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function writeJsonStorage<T>(key: string, value: T, eventName: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(eventName, { detail: value }));
}

function deleteStorage(key: string, eventName: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(key);
  window.dispatchEvent(new CustomEvent(eventName, { detail: null }));
}

function createAlbumId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseYear(value: string) {
  if (!/^\d{4}$/.test(value.trim())) {
    return undefined;
  }

  const year = Number.parseInt(value, 10);
  return Number.isFinite(year) ? year : undefined;
}

function stripLinePrefix(value: string) {
  return value
    .trim()
    .replace(/^(?:[-*•]|\d+[\.\)\-、])\s*/, "")
    .trim();
}

function parseImportedLine(line: string): ImportedAlbumDraft | null {
  const sourceText = line.trim();
  const cleaned = stripLinePrefix(sourceText);

  if (!cleaned) {
    return null;
  }

  const slashParts = cleaned.split(/\s*\/\s*/).map((part) => part.trim()).filter(Boolean);

  if (slashParts.length >= 2) {
    const [artist, albumPart, thirdPart, ...rest] = slashParts;
    const year = thirdPart ? parseYear(thirdPart) : undefined;
    const notes = year ? rest.join(" / ").trim() || undefined : [thirdPart, ...rest]
      .filter(Boolean)
      .join(" / ")
      .trim() || undefined;

    if (artist && albumPart) {
      return {
        artist,
        album: albumPart,
        year,
        notes,
        sourceText,
      };
    }
  }

  const dashMatch = cleaned.match(/^(.+?)\s+[—–-]\s+(.+?)$/);

  if (dashMatch) {
    const artist = dashMatch[1].trim();
    const albumSegment = dashMatch[2].trim();
    const yearMatch = albumSegment.match(/^(.*?)(?:\s*\((\d{4})\))$/);

    return {
      artist,
      album: yearMatch ? yearMatch[1].trim() : albumSegment,
      year: yearMatch ? parseYear(yearMatch[2]) : undefined,
      sourceText,
    };
  }

  return null;
}

export function normalizeImportedAlbums(rawText: string): ImportNormalizationResult {
  const drafts: ImportedAlbumDraft[] = [];
  const rejected: ImportRejectedLine[] = [];

  for (const rawLine of rawText.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const parsed = parseImportedLine(line);

    if (!parsed || !parsed.artist || !parsed.album) {
      rejected.push({
        sourceText: line,
        reason: "无法识别为“艺人 / 专辑 / 年份”或“艺人 - 专辑”格式。",
      });
      continue;
    }

    drafts.push(parsed);
  }

  return {
    drafts,
    rejected,
  };
}

export function buildCustomAlbumsFromDrafts(
  drafts: ImportedAlbumDraft[],
  existingAlbums: CustomAlbum[] = [],
) {
  const existingKeys = new Set(existingAlbums.map((album) => getAlbumKey(album)));
  const seenKeys = new Set<string>();
  const createdAt = new Date().toISOString();
  const albums: CustomAlbum[] = [];

  for (const draft of drafts) {
    const key = getAlbumKey(draft);

    if (existingKeys.has(key) || seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    albums.push({
      id: createAlbumId(),
      artist: draft.artist.trim(),
      album: draft.album.trim(),
      year: draft.year,
      notes: draft.notes?.trim() || undefined,
      sourceText: draft.sourceText.trim(),
      createdAt,
    });
  }

  return albums;
}

export function readCustomLibrary() {
  const library = readJsonStorage<CustomAlbum[]>(CUSTOM_LIBRARY_STORAGE_KEY, []);
  return Array.isArray(library) ? library : [];
}

export function writeCustomLibrary(library: CustomAlbum[]) {
  writeJsonStorage(CUSTOM_LIBRARY_STORAGE_KEY, library, CUSTOM_LIBRARY_EVENT);
}

export function removeCustomAlbum(albumId: string) {
  const nextLibrary = readCustomLibrary().filter((album) => album.id !== albumId);
  writeCustomLibrary(nextLibrary);
  return nextLibrary;
}

export function clearCustomLibrary() {
  deleteStorage(CUSTOM_LIBRARY_STORAGE_KEY, CUSTOM_LIBRARY_EVENT);
}

export function readRecommendationSettings() {
  const settings = readJsonStorage<RecommendationSettings>(
    RECOMMENDATION_SETTINGS_STORAGE_KEY,
    DEFAULT_RECOMMENDATION_SETTINGS,
  );

  return {
    ...DEFAULT_RECOMMENDATION_SETTINGS,
    ...settings,
  };
}

export function writeRecommendationSettings(settings: RecommendationSettings) {
  writeJsonStorage(
    RECOMMENDATION_SETTINGS_STORAGE_KEY,
    settings,
    RECOMMENDATION_SETTINGS_EVENT,
  );
}

export function readRecommendationHistory() {
  const history = readJsonStorage<RecommendationHistory>(
    RECOMMENDATION_HISTORY_STORAGE_KEY,
    DEFAULT_RECOMMENDATION_HISTORY,
  );

  return {
    assignments: history.assignments || {},
    cycleSeenIds: Array.isArray(history.cycleSeenIds) ? history.cycleSeenIds : [],
    updatedAt: history.updatedAt || "",
  };
}

export function writeRecommendationHistory(history: RecommendationHistory) {
  writeJsonStorage(
    RECOMMENDATION_HISTORY_STORAGE_KEY,
    history,
    RECOMMENDATION_HISTORY_EVENT,
  );
}

function writeRecommendationCookie(snapshot: CustomRecommendationSnapshot | null) {
  if (typeof document === "undefined") {
    return;
  }

  if (!snapshot) {
    document.cookie = `${CUSTOM_RECOMMENDATION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }

  const serialized = encodeURIComponent(JSON.stringify(snapshot));
  document.cookie = `${CUSTOM_RECOMMENDATION_COOKIE}=${serialized}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function parseRecommendationCookieValue(cookieValue?: string | null) {
  if (!cookieValue) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(cookieValue)) as CustomRecommendationSnapshot;
  } catch {
    return null;
  }
}

function cleanHistory(
  history: RecommendationHistory,
  library: CustomAlbum[],
) {
  const validIds = new Set(library.map((album) => album.id));
  const assignments = Object.fromEntries(
    Object.entries(history.assignments).filter(([, albumId]) => validIds.has(albumId)),
  );

  return {
    assignments: pruneAssignments(assignments),
    cycleSeenIds: history.cycleSeenIds.filter((albumId) => validIds.has(albumId)),
    updatedAt: history.updatedAt,
  };
}

export function resolveCustomRecommendation(args: {
  library: CustomAlbum[];
  settings: RecommendationSettings;
  history: RecommendationHistory;
  timeZone: string;
  now?: Date;
}) {
  const now = args.now || new Date();
  const dateKey = getDateKey(now, args.timeZone);
  const orderedLibrary = [...args.library].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
  const cleanedHistory = cleanHistory(args.history, orderedLibrary);

  if (args.settings.source !== "custom" || orderedLibrary.length === 0) {
    return {
      dateKey,
      history: cleanedHistory,
      snapshot: null,
    };
  }

  const existingAlbumId = cleanedHistory.assignments[dateKey];
  const existingAlbum = orderedLibrary.find((album) => album.id === existingAlbumId);

  if (existingAlbum) {
    return {
      dateKey,
      history: cleanedHistory,
      snapshot: {
        source: "custom" as const,
        dateKey,
        album: existingAlbum,
        settings: args.settings,
      },
    };
  }

  let nextAlbum: CustomAlbum | undefined;
  const nextHistory: RecommendationHistory = {
    ...cleanedHistory,
    assignments: { ...cleanedHistory.assignments },
    cycleSeenIds: [...cleanedHistory.cycleSeenIds],
  };

  if (args.settings.allowRepeat) {
    if (args.settings.mode === "list_order") {
      const assignmentCount = Object.keys(nextHistory.assignments).length;
      nextAlbum = orderedLibrary[assignmentCount % orderedLibrary.length];
    } else {
      const pool = [...orderedLibrary].sort((a, b) => a.id.localeCompare(b.id));
      nextAlbum = pool[hashDateKey(dateKey) % pool.length];
    }
  } else {
    let available = orderedLibrary.filter(
      (album) => !nextHistory.cycleSeenIds.includes(album.id),
    );

    if (available.length === 0) {
      nextHistory.cycleSeenIds = [];
      available = orderedLibrary;
    }

    if (args.settings.mode === "list_order") {
      nextAlbum = available[0];
    } else {
      const pool = [...available].sort((a, b) => a.id.localeCompare(b.id));
      nextAlbum = pool[hashDateKey(dateKey) % pool.length];
    }

    if (nextAlbum) {
      nextHistory.cycleSeenIds = [...nextHistory.cycleSeenIds, nextAlbum.id];
    }
  }

  if (!nextAlbum) {
    return {
      dateKey,
      history: cleanedHistory,
      snapshot: null,
    };
  }

  nextHistory.assignments[dateKey] = nextAlbum.id;
  nextHistory.assignments = pruneAssignments(nextHistory.assignments);
  nextHistory.updatedAt = new Date().toISOString();

  return {
    dateKey,
    history: nextHistory,
    snapshot: {
      source: "custom" as const,
      dateKey,
      album: nextAlbum,
      settings: args.settings,
    },
  };
}

export function syncCustomRecommendationSnapshot(timeZone: string, now = new Date()) {
  const library = readCustomLibrary();
  const settings = readRecommendationSettings();
  const history = readRecommendationHistory();
  const result = resolveCustomRecommendation({
    library,
    settings,
    history,
    timeZone,
    now,
  });

  writeRecommendationHistory(result.history);
  writeRecommendationCookie(result.snapshot);

  return result.snapshot;
}
