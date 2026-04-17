/**
 * Cloudinary Upload Utility
 * Cloud:  drbpdgp4c
 * Preset: news_upload (unsigned)
 * Types:  image, video, audio (mp3)
 */

const CLOUDINARY_CONFIG = {
  cloudName:    "drbpdgp4c",
  uploadPreset: "news_upload",
  uploadUrl:    `https://api.cloudinary.com/v1_1/drbpdgp4c/auto/upload`,
};

/**
 * Upload any file (image / video / audio) to Cloudinary.
 * @param {File} file       — File object from <input type="file"> or Blob
 * @param {object} [opts]   — Optional overrides
 * @param {string} [opts.folder]  — Cloudinary folder e.g. "news/images"
 * @returns {Promise<string>} secure_url of the uploaded asset
 */
async function uploadToCloudinary(file, opts = {}) {
  const formData = new FormData();
  formData.append("file",           file);
  formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);

  if (opts.folder) {
    formData.append("folder", opts.folder);
  }

  const response = await fetch(CLOUDINARY_CONFIG.uploadUrl, {
    method: "POST",
    body:   formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `Upload failed: ${response.status}`);
  }

  const data = await response.json();
  return data.secure_url;
}

/* ── Convenience wrappers ─────────────────────────────── */

async function uploadImage(file, opts = {}) {
  return uploadToCloudinary(file, { folder: "news/images", ...opts });
}

async function uploadVideo(file, opts = {}) {
  return uploadToCloudinary(file, { folder: "news/videos", ...opts });
}

async function uploadAudio(file, opts = {}) {
  return uploadToCloudinary(file, { folder: "news/audio", ...opts });
}