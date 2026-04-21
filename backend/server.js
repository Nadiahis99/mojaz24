const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express  = require("express");
const cors     = require("cors");
const mongoose = require("mongoose");
const bcrypt   = require("bcrypt");

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ─── Static Frontend ──────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "../frontend")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    databaseReady: mongoose.connection.readyState === 1
  });
});

// ─── Schemas & Models ─────────────────────────────────────────────────────────
const newsSchema = new mongoose.Schema(
  {
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
  },
  { versionKey: false }
);

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    name:     { type: String, default: "" },
    role:     { type: String, enum: ["admin", "journalist"], default: "journalist" },
    avatar:   { type: String, default: "" }
  },
  { versionKey: false }
);

const News = mongoose.model("News", newsSchema);
const User = mongoose.model("User", userSchema);

// ─── Authorization Middleware ────────────────────────────────────────────────
const protect = (roles = []) => {
  return (req, res, next) => {
    const userHeader = req.headers['x-user-session'];
    
    if (!userHeader) {
      return res.status(401).json({ message: "غير مصرح لك، يرجى تسجيل الدخول أولاً" });
    }

    try {
      const user = JSON.parse(userHeader);
      // التحقق من الدور (Admin أو Journalist)
      if (roles.length && !roles.includes(user.role)) {
        return res.status(403).json({ message: "ليس لديك صلاحية للقيام بهذا الإجراء" });
      }
      req.user = user;
      next();
    } catch (e) {
      return res.status(400).json({ message: "بيانات الجلسة غير صالحة" });
    }
  };
};

// ─── Seed Users ───────────────────────────────────────────────────────────────
async function seedUsers() {
  if (mongoose.connection.readyState !== 1) {
    console.warn("Seed skipped — DB not ready");
    return;
  }

  const count = await User.countDocuments();
  if (count > 0) {
    console.log(`Seed skipped — ${count} users already exist`);
    return;
  }

  const users = [
    { username: "admin",       password: "admin2024", name: "مدير النظام",  role: "admin",      avatar: "م" },
    { username: "journalist1", password: "press2024", name: "الصحفي الأول", role: "journalist", avatar: "ص" },
    { username: "journalist2", password: "press1234", name: "الصحفية نور",  role: "journalist", avatar: "ن" }
  ];

  const hashed = await Promise.all(
    users.map(async (u) => ({ ...u, password: await bcrypt.hash(u.password, 10) }))
  );

  await User.insertMany(hashed);
  console.log("✅ Default users seeded successfully");
}

// ─── Database Connection ──────────────────────────────────────────────────────
async function connectDatabase() {
  if (!process.env.MONGO_URI) {
    console.warn("MONGO_URI is missing — API routes will return 503.");
    return;
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");
    await seedUsers();
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
  }
}

function requireDB(res) {
  if (mongoose.connection.readyState === 1) return true;
  res.status(503).json({ message: "Database is not available right now." });
  return false;
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────
app.post("/auth/login", async (req, res) => {
  if (!requireDB(res)) return;
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: "username و password مطلوبان" });

  try {
    const user = await User.findOne({ username: username.trim() });
    if (!user) return res.status(401).json({ success: false, message: "اسم المستخدم أو كلمة المرور غير صحيحة" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "اسم المستخدم أو كلمة المرور غير صحيحة" });

    const session = {
      userId:   user._id,
      username: user.username,
      name:     user.name,
      role:     user.role,
      avatar:   user.avatar,
      loginAt:  Date.now()
    };
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// محمي: للآدمن فقط
app.get("/auth/users", protect(["admin"]), async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const users = await User.find({}, "-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── News Routes ──────────────────────────────────────────────────────────────

app.get("/news/categories", async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const result = await News.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);
    const cats = {};
    result.forEach((r) => { cats[r._id] = r.count; });
    res.json(cats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/news", async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const filter = req.query.category ? { category: req.query.category } : {};
    const news = await News.find(filter).sort({ createdAt: -1 });
    res.json(news);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/news/:id", async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ message: "الخبر غير موجود" });
    res.json(news);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// محمي: للآدمن والصحفيين
app.post("/news", protect(["admin", "journalist"]), async (req, res) => {
  if (!requireDB(res)) return;
  const { title, content, category, image, contentImage, video, videoFile, audioFile } = req.body;
  if (!title || !content)
    return res.status(400).json({ message: "title و content مطلوبان" });
  try {
    const article = new News({ title, content, category, image, contentImage, video, videoFile, audioFile });
    const saved = await article.save();
    res.status(201).json({ message: "تم إضافة الخبر بنجاح", news: saved });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// محمي: للآدمن والصحفيين
app.put("/news/:id", protect(["admin", "journalist"]), async (req, res) => {
  if (!requireDB(res)) return;
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

// محمي: للآدمن فقط
app.delete("/news/:id", protect(["admin"]), async (req, res) => {
  if (!requireDB(res)) return;
  try {
    const deleted = await News.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "الخبر غير موجود" });
    res.json({ message: "تم حذف الخبر بنجاح" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── 404 Fallback ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `المسار ${req.path} غير موجود` });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
connectDatabase().finally(() => {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
});
