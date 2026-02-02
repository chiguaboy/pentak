import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_DIR = path.join(__dirname, "data");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const THUMBS_DIR = path.join(IMAGES_DIR, "thumbs");
const LEGACY_DATA_FILE = path.join(DATA_DIR, "posts.json");
const MONTH_FILE_PREFIX = "posts-";
const MONTH_FILE_RE = /^posts-(\d{4}-\d{2})\.json$/;
const USERS_FILE = path.join(__dirname, "config", "users.json");

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/welog/images", express.static(IMAGES_DIR));
// app.use("/images", express.static(IMAGES_DIR));

const API_PREFIXES = ["/api", "/api/welog", "/welog/api"];
const registerApiRoute = (method, routePath, handler) => {
  API_PREFIXES.forEach((prefix) => {
    app[method](`${prefix}${routePath}`, handler);
  });
};

const readJson = async (filePath, fallback) => {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
};

const writeJson = async (filePath, data) => {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
};

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const formatBeijingTime = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
};

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

const buildImageUrl = (filename) => `/welog/images/${filename}`;

const getMonthKey = (value) => {
  if (!value) {
    return "";
  }
  const match = String(value).match(/^(\d{4}-\d{2})/);
  if (!match) {
    return "";
  }
  const month = match[1];
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : "";
};

const getMonthFromPost = (post) => {
  if (!post) {
    return "";
  }
  const explicit = getMonthKey(post.month);
  if (explicit) {
    return explicit;
  }
  return getMonthKey(post.createdAt || post.updatedAt);
};

const getMonthlyFile = (month) => path.join(DATA_DIR, `${MONTH_FILE_PREFIX}${month}.json`);

const listMonthlyFiles = async () => {
  try {
    const entries = await fs.readdir(DATA_DIR);
    return entries
      .map((entry) => {
        const match = entry.match(MONTH_FILE_RE);
        return match ? { month: match[1], file: entry } : null;
      })
      .filter(Boolean);
  } catch (error) {
    return [];
  }
};

const readLegacyPosts = async () => readJson(LEGACY_DATA_FILE, []);

const readMonthlyPosts = async (month) => {
  if (!month) {
    return [];
  }
  const filePath = getMonthlyFile(month);
  const posts = await readJson(filePath, null);
  if (posts !== null) {
    return posts;
  }
  const legacyPosts = await readLegacyPosts();
  const filtered = legacyPosts.filter((post) => getMonthFromPost(post) === month);
  if (filtered.length > 0) {
    await writeJson(filePath, filtered);
  }
  return filtered;
};

const sanitizeCommentText = (value) => String(value || "").trim().slice(0, 100);

const normalizeCommentList = (comments) => {
  if (!Array.isArray(comments)) {
    return [];
  }
  return comments
    .map((comment, index) => {
      if (typeof comment === "string") {
        return {
          id: `comment-${index}`,
          user: "匿名用户",
          content: sanitizeCommentText(comment),
          createdAt: "",
        };
      }
      const content = sanitizeCommentText(comment?.content ?? comment?.text ?? "");
      if (!content) {
        return null;
      }
      return {
        id: comment?.id ?? `comment-${index}`,
        user: comment?.user ?? comment?.author ?? "匿名用户",
        content,
        createdAt: comment?.createdAt ?? "",
      };
    })
    .filter(Boolean);
};

const normalizePost = (post) => {
  if (!post) {
    return post;
  }
  const comments = normalizeCommentList(post.comments);
  return {
    ...post,
    comments,
    month: getMonthFromPost(post),
    hasComments: comments.length > 0,
  };
};

const normalizePostForStorage = (post) => {
  if (!post) {
    return post;
  }
  const comments = normalizeCommentList(post.comments);
  return {
    ...post,
    comments,
    month: getMonthFromPost(post),
  };
};

const sortPostsByTime = (posts) =>
  posts
    .slice()
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

const mergePosts = (lists) => {
  const map = new Map();
  lists.forEach((list) => {
    (list || []).forEach((post) => {
      if (post?.id && !map.has(post.id)) {
        map.set(post.id, normalizePostForStorage(post));
      }
    });
  });
  return Array.from(map.values());
};

const readAllPosts = async () => {
  const monthFiles = await listMonthlyFiles();
  const monthlyLists = await Promise.all(monthFiles.map((item) => readMonthlyPosts(item.month)));
  const legacyPosts = await readLegacyPosts();
  return sortPostsByTime(mergePosts([...monthlyLists, legacyPosts]));
};

const findPostLocation = async (id, monthHint) => {
  if (monthHint) {
    const posts = await readMonthlyPosts(monthHint);
    const index = posts.findIndex((item) => item.id === id);
    if (index !== -1) {
      return { month: monthHint, posts, index };
    }
  }

  const monthFiles = await listMonthlyFiles();
  for (const item of monthFiles) {
    if (item.month === monthHint) {
      continue;
    }
    const posts = await readMonthlyPosts(item.month);
    const index = posts.findIndex((entry) => entry.id === id);
    if (index !== -1) {
      return { month: item.month, posts, index };
    }
  }

  const legacyPosts = await readLegacyPosts();
  const legacyIndex = legacyPosts.findIndex((entry) => entry.id === id);
  if (legacyIndex === -1) {
    return null;
  }
  const legacyPost = legacyPosts[legacyIndex];
  const legacyMonth = getMonthFromPost(legacyPost)
    || monthHint
    || getMonthKey(formatBeijingTime());
  if (!legacyMonth) {
    return null;
  }
  const monthlyPosts = await readMonthlyPosts(legacyMonth);
  let monthIndex = monthlyPosts.findIndex((entry) => entry.id === id);
  if (monthIndex === -1) {
    monthlyPosts.unshift(normalizePostForStorage(legacyPost));
    monthIndex = 0;
  }
  return { month: legacyMonth, posts: monthlyPosts, index: monthIndex };
};

const sanitizeComments = (comments) => {
  if (!Array.isArray(comments)) {
    return null;
  }
  const now = formatBeijingTime();
  return normalizeCommentList(comments).map((comment, index) => ({
    ...comment,
    id: comment.id || `comment-${Date.now()}-${index}`,
    createdAt: comment.createdAt || now,
  }));
};

const migrateLegacyPosts = async () => {
  const legacyPosts = await readLegacyPosts();
  if (!legacyPosts.length) {
    return;
  }
  const grouped = new Map();
  legacyPosts.forEach((post) => {
    const month = getMonthFromPost(post);
    if (!month) {
      return;
    }
    if (!grouped.has(month)) {
      grouped.set(month, []);
    }
    grouped.get(month).push(normalizePostForStorage(post));
  });
  for (const [month, posts] of grouped.entries()) {
    const filePath = getMonthlyFile(month);
    const existing = await readJson(filePath, []);
    const merged = mergePosts([existing, posts]);
    if (merged.length > 0) {
      await writeJson(filePath, merged);
    }
  }
};

registerApiRoute("post", "/login", async (req, res) => {
  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ message: "请输入密码" });
  }
  const users = await readJson(USERS_FILE, {});
  const user = users[password];
  if (!user) {
    return res.status(401).json({ message: "查无此车" });
  }
  return res.json({ user });
});

registerApiRoute("post", "/uploads", async (req, res) => {
  const { image, images } = req.body || {};
  const toUpload = Array.isArray(images) ? images : (image ? [image] : []);
  if (toUpload.length === 0) {
    return res.status(400).json({ message: "缺少图片数据" });
  }
  await ensureDir(IMAGES_DIR);
  await ensureDir(THUMBS_DIR);
  const urls = [];
  const savedFiles = [];
  for (const item of toUpload) {
    const parsed = parseBase64Image(item);
    if (!parsed) {
      return res.status(400).json({ message: "图片格式错误" });
    }
    const baseName = nanoid();
    const filename = `${baseName}.${parsed.ext}`;
    const thumbFilename = `${baseName}_thumb.${parsed.ext}`;
    const filePath = path.join(IMAGES_DIR, filename);
    const thumbPath = path.join(THUMBS_DIR, thumbFilename);
    await fs.writeFile(filePath, parsed.buffer);
    try {
      const sharpInstance = sharp(parsed.buffer).resize({
        width: 480,
        withoutEnlargement: true,
      });
      if (parsed.ext === "png") {
        await sharpInstance.png({ compressionLevel: 8 }).toFile(thumbPath);
      } else if (parsed.ext === "webp") {
        await sharpInstance.webp({ quality: 72 }).toFile(thumbPath);
      } else {
        await sharpInstance.jpeg({ quality: 72 }).toFile(thumbPath);
      }
    } catch (err) {
      const cleanupTargets = [...savedFiles, { filePath, thumbPath }];
      await Promise.allSettled(
        cleanupTargets.map(async ({ filePath: currentFile, thumbPath: currentThumb }) => {
          await fs.unlink(currentFile).catch(() => {});
          await fs.unlink(currentThumb).catch(() => {});
        }),
      );
      return res.status(400).json({ message: "图片格式不支持，请尝试截图重新上传" });
    }
    savedFiles.push({ filePath, thumbPath });
    urls.push({
      url: buildImageUrl(filename),
      thumbUrl: `/welog/images/thumbs/${thumbFilename}`,
    });
  }
  if (Array.isArray(images)) {
    return res.json({ urls });
  }
  return res.json(urls[0]);
});

registerApiRoute("get", "/posts", async (req, res) => {
  const month = getMonthKey(req.query.month);
  if (month) {
    const posts = await readMonthlyPosts(month);
    return res.json(posts.map(normalizePost));
  }
  const posts = await readAllPosts();
  return res.json(posts.map(normalizePost));
});

registerApiRoute("get", "/posts/:id", async (req, res) => {
  const month = getMonthKey(req.query.month);
  const location = await findPostLocation(req.params.id, month);
  if (!location) {
    return res.status(404).json({ message: "内容不存在" });
  }
  return res.json(normalizePost(location.posts[location.index]));
});

registerApiRoute("post", "/posts", async (req, res) => {
  const { user, content, images, month } = req.body || {};
  if (!user || !content) {
    return res.status(400).json({ message: "缺少必要字段" });
  }
  const now = new Date();
  const beijingTime = formatBeijingTime(now);
  const monthKey = getMonthKey(month) || getMonthKey(beijingTime);
  const posts = await readMonthlyPosts(monthKey);
  const newPost = {
    id: nanoid(),
    user,
    content,
    images: images || [],
    createdAt: beijingTime,
    month: monthKey,
    comments: [],
  };
  posts.unshift(newPost);
  await writeJson(getMonthlyFile(monthKey), posts);
  return res.status(201).json(normalizePost(newPost));
});

registerApiRoute("put", "/posts/:id", async (req, res) => {
  const { content, images, month, comments } = req.body || {};
  const monthKey = getMonthKey(req.query.month) || getMonthKey(month);
  const location = await findPostLocation(req.params.id, monthKey);
  if (!location) {
    return res.status(404).json({ message: "内容不存在" });
  }
  const { posts, index, month: foundMonth } = location;
  const normalizedComments = sanitizeComments(comments);
  posts[index] = {
    ...posts[index],
    content: content ?? posts[index].content,
    images: images ?? posts[index].images,
    comments: normalizedComments ?? posts[index].comments ?? [],
    updatedAt: formatBeijingTime(),
  };
  await writeJson(getMonthlyFile(foundMonth), posts);
  return res.json(normalizePost(posts[index]));
});

migrateLegacyPosts().catch((error) => {
  console.error("Failed to migrate legacy posts:", error);
});

app.listen(PORT, () => {
  console.log(`WeLog backend running at http://localhost:${PORT}`);
});
