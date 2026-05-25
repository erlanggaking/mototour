const multer = require('multer');
const path = require('path');
const fs = require('fs');

// UPLOAD_DIR can be overridden by env var (e.g. Render persistent disk at /var/data/uploads).
// We always also expose them at /uploads via a static route in server.js.
const uploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 40);
    cb(null, `${Date.now()}_${base}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif|svg\+xml)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image uploads are allowed'));
  }
});

module.exports = upload;
