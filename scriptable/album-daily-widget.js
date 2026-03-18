// Album Daily widget for Scriptable.
// 1. Replace BASE_URL with your deployed site URL.
// 2. In Scriptable, create a new script and paste this file in.
// 3. Add a small widget on iPhone and select this script.

const BASE_URL = "http://192.168.1.177:3000";
const API_URL = `${BASE_URL}/api/album`;

async function loadAlbum() {
  const request = new Request(API_URL);
  request.headers = {
    Accept: "application/json",
  };

  return await request.loadJSON();
}

async function loadCover(coverUrl) {
  if (!coverUrl) {
    return null;
  }

  const request = new Request(coverUrl);
  return await request.loadImage();
}

function addText(stack, text, size, color, options = {}) {
  const label = stack.addText(text);
  label.font = options.font || Font.systemFont(size);
  label.textColor = new Color(color);
  label.lineLimit = options.lineLimit ?? 1;
  label.minimumScaleFactor = options.minimumScaleFactor ?? 0.7;
  return label;
}

async function createWidget() {
  const data = await loadAlbum();
  const widget = new ListWidget();
  widget.backgroundColor = new Color("#F7F8F2");
  widget.setPadding(0, 0, 0, 0);
  widget.url = data.spotifyUrl || `${BASE_URL}/widget`;

  const card = widget.addStack();
  card.layoutHorizontally();
  card.setPadding(0, 0, 0, 0);
  card.cornerRadius = 0;
  card.centerAlignContent();

  const image = await loadCover(data.coverUrl);
  if (image) {
    const imageView = card.addImage(image);
    imageView.imageSize = new Size(108, 108);
    imageView.cornerRadius = 4;
    imageView.resizable = true;
  }

  card.addSpacer(12);

  const content = card.addStack();
  content.layoutVertically();
  content.centerAlignContent();
  content.size = new Size(0, 108);

  const title = addText(content, data.album.album, 18, "#22242C", {
    font: Font.boldSystemFont(18),
    lineLimit: 2,
    minimumScaleFactor: 0.6,
  });
  title.leftAlignText();

  content.addSpacer(3);

  const artist = addText(content, data.album.artist, 11, "#595D69", {
    font: Font.mediumSystemFont(11),
    lineLimit: 2,
    minimumScaleFactor: 0.7,
  });
  artist.leftAlignText();

  content.addSpacer(5);

  const meta = data.album.label || `${data.album.year}`;
  const metaLabel = addText(content, meta, 9, "#8A8F9C", {
    font: Font.mediumSystemFont(9),
    lineLimit: 1,
  });
  metaLabel.leftAlignText();

  return widget;
}

const widget = await createWidget();

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentSmall();
}

Script.complete();
