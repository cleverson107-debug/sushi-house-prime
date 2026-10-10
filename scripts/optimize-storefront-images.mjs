import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

async function optimize(source, destination, options) {
  let pipeline = sharp(source).rotate();
  if (options.width)
    pipeline = pipeline.resize({
      width: options.width,
      withoutEnlargement: true,
      fit: "inside",
    });
  const output = await pipeline
    .webp({ quality: options.quality, effort: 6, smartSubsample: true })
    .toBuffer();
  await writeFile(destination, output);
}

await optimize(
  "public/festival-inauguracao.webp",
  "public/festival-inauguracao-v2.webp",
  { quality: 70 },
);
await optimize(
  "public/festival-inauguracao.webp",
  "public/festival-inauguracao-mobile.webp",
  { width: 768, quality: 68 },
);
await optimize(
  "public/sushi-house-logo.webp",
  "public/sushi-house-logo-v2.webp",
  { width: 160, quality: 76 },
);

const thumbnailsDirectory = "public/products/thumbs";
const optimizedThumbnailsDirectory = "public/products/thumbs-v2";
await mkdir(optimizedThumbnailsDirectory, { recursive: true });
for (const name of await readdir(thumbnailsDirectory)) {
  if (!name.endsWith(".webp")) continue;
  await optimize(
    path.join(thumbnailsDirectory, name),
    path.join(optimizedThumbnailsDirectory, name),
    { width: 256, quality: 72 },
  );
}
