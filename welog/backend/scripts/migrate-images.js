import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "..", "data");
const imagesDir = path.join(dataDir, "images");
const postFileRe = /^posts(-\d{4}-\d{2})?\.json$/;

const parseBase64Image = (dataUrl) => {
  const match = String(dataUrl || "").match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    return null;
  }
  const mime = match[1];
  const base64 = match[2];
  let ext = mime.split("/")[1] || "png";
  if (ext.includes("+")) {
    ext = ext.split("+")[0];
  }
  if (ext === "jpeg") {
    ext = "jpg";
  }
  return {
    buffer: Buffer.from(base64, "base64"),
    ext,
  };
};

const normalizeImageUrl = (value) => {
  const str = String(value || "");
  if (!str) {
    return "";
  }
  if (str.startsWith("/welog/images/")) {
    return str;
  }
  if (str.startsWith("/images/")) {
    return str.replace("/images/", "/welog/images/");
  }
  if (str.startsWith("http://") || str.startsWith("https://")) {
    const welogIndex = str.indexOf("/welog/images/");
    if (welogIndex !== -1) {
      return str.slice(welogIndex);
    }
    const imagesIndex = str.indexOf("/images/");
    if (imagesIndex !== -1) {
      return str.slice(imagesIndex).replace("/images/", "/welog/images/");
    }
  }
  return str;
};

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const ensureThumb = async (originalPath, filename, ext) => {
  const thumbFilename = `${filename}_thumb.${ext}`;
  const thumbPath = path.join(imagesDir, "thumbs", thumbFilename);
  try {
    await fs.access(thumbPath);
    return `/welog/images/thumbs/${thumbFilename}`;
  } catch (error) {
    // continue to generate
  }
  await ensureDir(path.join(imagesDir, "thumbs"));
  const buffer = await fs.readFile(originalPath);
  const sharpInstance = sharp(buffer).resize({ width: 480, withoutEnlargement: true });
  if (ext === "png") {
    await sharpInstance.png({ compressionLevel: 8 }).toFile(thumbPath);
  } else if (ext === "webp") {
    await sharpInstance.webp({ quality: 72 }).toFile(thumbPath);
  } else {
    await sharpInstance.jpeg({ quality: 72 }).toFile(thumbPath);
  }
  return `/welog/images/thumbs/${thumbFilename}`;
};

const migrateFile = async (filePath) => {
  const content = await fs.readFile(filePath, "utf-8");
  let data;
  try {
    data = JSON.parse(content);
  } catch (error) {
    console.warn(`Skip invalid JSON: ${filePath}`);
    return { updated: false, migrated: 0 };
  }
  if (!Array.isArray(data)) {
    return { updated: false, migrated: 0 };
  }

  let updated = false;
  let migratedCount = 0;

  const updatedPosts = await Promise.all(
    data.map(async (post) => {
      if (!post || !Array.isArray(post.images) || post.images.length === 0) {
        return post;
      }
      const newImages = [];
      let postUpdated = false;
      for (const image of post.images) {
        if (image && typeof image === "object" && (image.url || image.thumbUrl)) {
          const normalizedUrl = normalizeImageUrl(image.url || image.thumbUrl);
          const ext = normalizedUrl.split(".").pop();
          const filename = path.basename(normalizedUrl, `.${ext}`);
          const fileOnDisk = path.join(imagesDir, `${filename}.${ext}`);
          let thumbUrl = image.thumbUrl ? normalizeImageUrl(image.thumbUrl) : "";
          if (!thumbUrl && normalizedUrl.startsWith("/welog/images/") && ext) {
            try {
              await fs.access(fileOnDisk);
              thumbUrl = await ensureThumb(fileOnDisk, filename, ext);
            } catch (error) {
              // ignore if original missing
            }
          }
          newImages.push({ url: normalizedUrl, thumbUrl: thumbUrl || normalizedUrl });
          if (normalizedUrl !== image.url || thumbUrl !== image.thumbUrl) {
            postUpdated = true;
          }
          continue;
        }
        const parsed = parseBase64Image(image);
        if (!parsed) {
          const normalized = normalizeImageUrl(image);
          if (normalized.startsWith("/welog/images/")) {
            const ext = normalized.split(".").pop();
            const filename = path.basename(normalized, `.${ext}`);
            const fileOnDisk = path.join(imagesDir, `${filename}.${ext}`);
            try {
              await fs.access(fileOnDisk);
              const thumbUrl = await ensureThumb(fileOnDisk, filename, ext);
              newImages.push({ url: normalized, thumbUrl });
              postUpdated = true;
              continue;
            } catch (error) {
              // fall through
            }
          }
          newImages.push(normalized);
          if (normalized !== image) {
            postUpdated = true;
          }
          continue;
        }
        await ensureDir(imagesDir);
        await ensureDir(path.join(imagesDir, "thumbs"));
        const baseName = crypto.randomUUID();
        const filename = `${baseName}.${parsed.ext}`;
        const thumbFilename = `${baseName}_thumb.${parsed.ext}`;
        await fs.writeFile(path.join(imagesDir, filename), parsed.buffer);
        const sharpInstance = sharp(parsed.buffer).resize({ width: 480, withoutEnlargement: true });
        if (parsed.ext === "png") {
          await sharpInstance.png({ compressionLevel: 8 }).toFile(path.join(imagesDir, "thumbs", thumbFilename));
        } else if (parsed.ext === "webp") {
          await sharpInstance.webp({ quality: 72 }).toFile(path.join(imagesDir, "thumbs", thumbFilename));
        } else {
          await sharpInstance.jpeg({ quality: 72 }).toFile(path.join(imagesDir, "thumbs", thumbFilename));
        }
        newImages.push({
          url: `/welog/images/${filename}`,
          thumbUrl: `/welog/images/thumbs/${thumbFilename}`,
        });
        postUpdated = true;
        migratedCount += 1;
      }
      if (postUpdated) {
        updated = true;
        return { ...post, images: newImages };
      }
      return post;
    }),
  );

  if (updated) {
    await fs.writeFile(filePath, JSON.stringify(updatedPosts, null, 2));
  }
  return { updated, migrated: migratedCount };
};

const main = async () => {
  const entries = await fs.readdir(dataDir);
  const targetFiles = entries.filter((entry) => postFileRe.test(entry));
  let totalMigrated = 0;
  for (const file of targetFiles) {
    const filePath = path.join(dataDir, file);
    const result = await migrateFile(filePath);
    if (result.migrated > 0) {
      console.log(`${file}: migrated ${result.migrated} images`);
    }
    totalMigrated += result.migrated;
  }
  console.log(`Done. Total migrated images: ${totalMigrated}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
