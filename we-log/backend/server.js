import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_FILE = path.join(__dirname, "data", "posts.json");
const USERS_FILE = path.join(__dirname, "config", "users.json");

app.use(cors());
app.use(express.json({ limit: "10mb" }));

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

app.post("/api/login", async (req, res) => {
  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ message: "请输入密码" });
  }
  const users = await readJson(USERS_FILE, {});
  const user = users[password];
  if (!user) {
    return res.status(401).json({ message: "密码错误" });
  }
  return res.json({ user });
});

app.get("/api/posts", async (req, res) => {
  const { month } = req.query;
  const posts = await readJson(DATA_FILE, []);
  const filtered = month
    ? posts.filter((post) => post.createdAt.startsWith(month))
    : posts;
  return res.json(filtered);
});

app.get("/api/posts/:id", async (req, res) => {
  const posts = await readJson(DATA_FILE, []);
  const post = posts.find((item) => item.id === req.params.id);
  if (!post) {
    return res.status(404).json({ message: "内容不存在" });
  }
  return res.json(post);
});

app.post("/api/posts", async (req, res) => {
  const { user, content, images } = req.body || {};
  if (!user || !content) {
    return res.status(400).json({ message: "缺少必要字段" });
  }
  const posts = await readJson(DATA_FILE, []);
  const now = new Date();
  const newPost = {
    id: nanoid(),
    user,
    content,
    images: images || [],
    createdAt: now.toISOString().slice(0, 16).replace("T", " "),
  };
  posts.unshift(newPost);
  await writeJson(DATA_FILE, posts);
  return res.status(201).json(newPost);
});

app.put("/api/posts/:id", async (req, res) => {
  const { content, images } = req.body || {};
  const posts = await readJson(DATA_FILE, []);
  const index = posts.findIndex((item) => item.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: "内容不存在" });
  }
  posts[index] = {
    ...posts[index],
    content: content ?? posts[index].content,
    images: images ?? posts[index].images,
    updatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
  };
  await writeJson(DATA_FILE, posts);
  return res.json(posts[index]);
});

app.listen(PORT, () => {
  console.log(`WeLog backend running at http://localhost:${PORT}`);
});
