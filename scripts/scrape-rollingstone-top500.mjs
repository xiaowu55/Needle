import { writeFile } from "node:fs/promises";

const BASE_URL =
  "https://www.rollingstone.com/music/music-lists/best-albums-of-all-time-1062063/";
const OUTPUT_PATH = new URL("../data/albums.json", import.meta.url);

const NAMED_ENTITIES = {
  amp: "&",
  apos: "'",
  nbsp: " ",
  quot: '"',
  hellip: "…",
  mdash: "—",
  ndash: "–",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  middot: "·",
};

function decodeEntities(value) {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_, entity) => {
    if (entity[0] === "#") {
      const isHex = entity[1]?.toLowerCase() === "x";
      const codePoint = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : _;
    }

    return NAMED_ENTITIES[entity] ?? _;
  });
}

function extractJsonObject(html, marker) {
  const start = html.indexOf(marker);

  if (start === -1) {
    throw new Error(`Marker not found: ${marker}`);
  }

  const jsonStart = start + marker.length;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = jsonStart; index < html.length; index += 1) {
    const char = html[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return JSON.parse(html.slice(jsonStart, index + 1));
      }
    }
  }

  throw new Error(`Could not extract JSON for marker: ${marker}`);
}

function stripTags(value) {
  return value
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\uFEFF/g, "")
    .trim();
}

function splitTitle(title) {
  const decoded = decodeEntities(title).replace(/\uFEFF/g, "").trim();
  const lastComma = decoded.lastIndexOf(",");

  if (lastComma === -1) {
    throw new Error(`Unexpected title format: ${decoded}`);
  }

  const artist = decoded.slice(0, lastComma).trim();
  const album = decoded
    .slice(lastComma + 1)
    .trim()
    .replace(/^[‘’'"“”]+/, "")
    .replace(/[‘’'"“”]+$/, "")
    .trim();

  if (!artist || !album) {
    throw new Error(`Unexpected title format: ${decoded}`);
  }

  return {
    artist,
    album,
  };
}

function splitSubtitle(subtitle) {
  const decoded = decodeEntities(subtitle).trim();
  const match =
    decoded.match(/^(.*?)(?:,|\.)\s*(\d{4})$/) ||
    decoded.match(/^(.*)\s+(\d{4})$/);

  if (!match) {
    throw new Error(`Unexpected subtitle format: ${decoded}`);
  }

  return {
    label: match[1].trim(),
    year: Number(match[2]),
  };
}

function normalizeAlbum(item) {
  const { artist, album } = splitTitle(item.title);
  const { label, year } = splitSubtitle(item.subtitle ?? item.additionalSubtitle ?? "");
  const descHtml = item.description.trim();
  const desc = decodeEntities(stripTags(descHtml));

  return {
    rank: Number(item.positionDisplay),
    artist,
    album,
    year,
    genre: "",
    label,
    cover: item.image || "",
    desc,
    desc_raw: desc,
    desc_html: descHtml,
    spotify_url: "",
    source_url: new URL(item.slug, BASE_URL).toString(),
  };
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function main() {
  const firstPageHtml = await fetchHtml(BASE_URL);
  const firstPageData = extractJsonObject(firstPageHtml, "var pmcGalleryExports = ");
  const pageLinks = [
    ...new Set(firstPageData.listNavBar.generatedRanges["800"].map((item) => item.link)),
  ];

  const pages = await Promise.all(
    pageLinks.map(async (link) => {
      const html = link === BASE_URL ? firstPageHtml : await fetchHtml(link);
      const data = extractJsonObject(html, "var pmcGalleryExports = ");
      return data.gallery;
    }),
  );

  const albums = pages
    .flat()
    .map(normalizeAlbum)
    .reduce((map, album) => map.set(album.rank, album), new Map())
    .values();

  const normalized = Array.from(albums).sort((a, b) => a.rank - b.rank);

  if (normalized.length !== 500) {
    throw new Error(`Expected 500 albums, got ${normalized.length}`);
  }

  await writeFile(OUTPUT_PATH, `${JSON.stringify(normalized, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        count: normalized.length,
        first: normalized[0],
        last: normalized.at(-1),
      },
      null,
      2,
    ),
  );
}

await main();
