const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "../backend/.env") });

const inputPath = path.resolve(process.argv[2] || path.join(__dirname, "generated/news-import.json"));

const newsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    category: { type: String, default: "" },
    image: { type: String, default: "" },
    contentImage: { type: String, default: "" },
    video: { type: String, default: "" },
    videoFile: { type: String, default: "" },
    audioFile: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

const News = mongoose.models.News || mongoose.model("News", newsSchema);

function normalizeTitle(value = "") {
  return value
    .normalize("NFKC")
    .replace(/[\u200e\u200f\ufeff]/g, " ")
    .replace(/[\u064b-\u065f\u0670\u06d6-\u06ed]/g, "")
    .replace(/^(?:[0-9٠-٩]+[\.\-،: ]*)?(?:عنوان[:： ]*)?/i, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[ؤئ]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\w\u0600-\u06FF ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in backend/.env");
  }

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const payload = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const articles = Array.isArray(payload) ? payload : payload.articles;
  if (!Array.isArray(articles) || !articles.length) {
    throw new Error("No articles found in the import payload");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const existing = await News.find({}, "title").lean();
  const titleKeys = new Set(existing.map((item) => normalizeTitle(item.title)));

  let inserted = 0;
  let skipped = 0;

  for (let index = 0; index < articles.length; index += 1) {
    const item = articles[index];
    const titleKey = normalizeTitle(item.title);
    if (!titleKey || titleKeys.has(titleKey)) {
      skipped += 1;
      continue;
    }

    const timestamp = new Date(Date.now() + index * 1000);
    await News.create({
      title: item.title,
      content: item.content,
      category: item.category || "",
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    titleKeys.add(titleKey);
    inserted += 1;
  }

  console.log(JSON.stringify({ total: articles.length, inserted, skipped }, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
