import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = new URL("../", import.meta.url);
const source = new URL("public/pwa.svg", root);
const sourcePath = fileURLToPath(source);

const pngIcons = [
  ["public/logo.png", 512],
  ["public/favicon-16x16.png", 16],
  ["public/favicon-32x32.png", 32],
  ["public/pwa-192x192.png", 192],
  ["public/pwa-512x512.png", 512],
  ["public/maskable-192x192.png", 192],
  ["public/maskable-512x512.png", 512],
  ["public/apple-touch-icon.png", 180]
];

async function renderPng(size) {
  return sharp(sourcePath)
    .resize(size, size, { fit: "contain" })
    .png()
    .toBuffer();
}

function createIco(images) {
  const headerSize = 6;
  const directorySize = images.length * 16;
  let imageOffset = headerSize + directorySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const directories = images.map(({ size, buffer }) => {
    const directory = Buffer.alloc(16);
    directory.writeUInt8(size === 256 ? 0 : size, 0);
    directory.writeUInt8(size === 256 ? 0 : size, 1);
    directory.writeUInt8(0, 2);
    directory.writeUInt8(0, 3);
    directory.writeUInt16LE(1, 4);
    directory.writeUInt16LE(32, 6);
    directory.writeUInt32LE(buffer.length, 8);
    directory.writeUInt32LE(imageOffset, 12);
    imageOffset += buffer.length;
    return directory;
  });

  return Buffer.concat([header, ...directories, ...images.map(({ buffer }) => buffer)]);
}

await mkdir(fileURLToPath(new URL("public/", root)), { recursive: true });

for (const [path, size] of pngIcons) {
  const target = new URL(path, root);
  await mkdir(dirname(fileURLToPath(target)), { recursive: true });
  await writeFile(target, await renderPng(size));
}

await writeFile(new URL("public/favicon.svg", root), await readFile(source));

const faviconImages = await Promise.all(
  [16, 32, 48].map(async (size) => ({
    size,
    buffer: await renderPng(size)
  }))
);

await writeFile(new URL("public/favicon.ico", root), createIco(faviconImages));

console.log("Generated logo, favicon and PWA icons from public/pwa.svg");
