
// api/[...path].js
// هذا الملف هو نقطة الدخول لكل طلبات /api/* على Vercel

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const express  = require("express");
const cors     = require("cors");
const mongoose = require("mongoose");
const bcrypt   = require("bcrypt");

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ─── Schemas ──────────────────────────────────────────────────────────────────
const newsSchema = new mongoose.Schema({
  title:        { type: String, required: true, trim: true },
  content:      { type: String, required: true },
  category:     { type: String, default: "" },
  image:        { type: String, default: "" },
  contentImage: { type: String, default: "" },
  video:        { type: String, default: "" },
  videoFile:    { type: String, default: "" },
  audioFile:    { type: String, default: "" },
  createdAt:    { type: Date,   default: Date.now },
  updatedAt:    { type: Date,   default: Date.now }
}, { versionKey: false });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  name:     { type: String, default: "" },
  role:     { type: String, enum: ["admin", "journalist"], default: "journalist" },
  avatar:   { type: String, default: "" }
}, { versionKey: false });

// منع إعادة تعريف الـ models عند hot-reload
const News = mongoose.models.News || mongoose.model("News", newsSchema);
const User = mongoose.models.User || mongoose.model("User", userSchema);

// ─── DB Connection ────────────────────────────────────────────────────────────
let isConnected = false;

async function connectDatabase() {
  if (isConnected) return;
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not defined");
  await mongoose.connect(process.env.MONGO_URI);
  isConnected = true;

  // Seed users if none exist
  const count = await User.countDocuments();
  if (count === 0) {
    const users = [
      { username: "admin",       password: "admin2024", name: "مدير النظام",  role: "admin",      avatar: "م" },
      { username: "journalist1", password: "press2024", name: "الصحفي الأول", role: "journalist", avatar: "ص" },
      { username: "journalist2", password: "press1234", name: "الصحفية نور",  role: "journalist", avatar: "ن" }
    ];
    const hashed = await Promise.all(
      users.map(async (u) => ({ ...u, password: await bcrypt.hash(u.password, 10) }))
    );
    await User.insertMany(hashed);
    console.log("✅ Default users seeded");
  }
}

// ─── Middleware: Auth ─────────────────────────────────────────────────────────
const protect = (roles = []) => (req, res, next) => {
  const header = req.headers['x-user-session'];
  if (!header) return res.status(401).json({ message: "غير مصرح لك" });
  try {
    const user = JSON.parse(header);
    if (roles.length && !roles.includes(user.role))
      return res.status(403).json({ message: "ليس لديك صلاحية" });
    req.user = user;
    next();
  } catch {
    res.status(400).json({ message: "بيانات الجلسة غير صالحة" });
  }
};

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get("/api/health", (req, res) => {
  res.json({ ok: true, db: mongoose.connection.readyState });
});

// Auth
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: "username و password مطلوبان" });
  try {
    const user = await User.findOne({ username: username.trim() });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ success: false, message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    const session = {
      userId: user._id, username: user.username,
      name: user.name, role: user.role, avatar: user.avatar, loginAt: Date.now()
    };
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/auth/users", protect(["admin"]), async (req, res) => {
  try {
    res.json(await User.find({}, "-password"));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// News — /categories قبل /:id مهم جداً
app.get("/api/news/categories", async (req, res) => {
  try {
    const result = await News.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]);
    const cats = {};
    result.forEach((r) => { cats[r._id] = r.count; });
    res.json(cats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/news", async (req, res) => {
  try {
    const filter = req.query.category ? { category: req.query.category } : {};
    res.json(await News.find(filter).sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/news/:id", async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ message: "الخبر غير موجود" });
    res.json(news);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/news", protect(["admin", "journalist"]), async (req, res) => {
  const { title, content, category, image, contentImage, video, videoFile, audioFile } = req.body;
  if (!title || !content)
    return res.status(400).json({ message: "title و content مطلوبان" });
  try {
    const saved = await new News({ title, content, category, image, contentImage, video, videoFile, audioFile }).save();
    res.status(201).json({ message: "تم إضافة الخبر بنجاح", news: saved });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put("/api/news/:id", protect(["admin", "journalist"]), async (req, res) => {
  try {
    const updated = await News.findByIdAndUpdate(
      req.params.id,
      { $set: { ...req.body, updatedAt: new Date() } },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "الخبر غير موجود" });
    res.json({ message: "تم تحديث الخبر بنجاح", news: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/news/:id", protect(["admin"]), async (req, res) => {
  try {
    const deleted = await News.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "الخبر غير موجود" });
    res.json({ message: "تم حذف الخبر بنجاح" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Vercel Handler ───────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  try {
    await connectDatabase();
  } catch (err) {
    return res.status(503).json({ message: "Database connection failed: " + err.message });
  }
  app(req, res);
};
