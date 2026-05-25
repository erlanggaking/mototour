require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const db = require('./models/db');
const { injectUser } = require('./middleware/auth');

// Auto-seed on startup if database is empty (safe: only fills empty tables)
try {
  const userCount = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  if (userCount === 0) {
    console.log('🌱 Empty database detected — running seed...');
    require('./data/seed');
  }
} catch (e) {
  console.error('Auto-seed skipped:', e.message);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (needed when behind Render/Heroku/etc for correct cookie behavior)
app.set('trust proxy', 1);

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static
app.use(express.static(path.join(__dirname, 'public')));

// If UPLOAD_DIR is set (e.g. Render persistent disk), also expose it at /uploads
if (process.env.UPLOAD_DIR) {
  const uploadPath = path.resolve(process.env.UPLOAD_DIR);
  if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
  app.use('/uploads', express.static(uploadPath));
}

// Body parsers
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(cookieParser());

// Session
const inProd = process.env.NODE_ENV === 'production';
app.use(session({
  secret: process.env.SESSION_SECRET || 'bali-adventure-moto-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
    httpOnly: true,
    secure: inProd,
    sameSite: 'lax'
  }
}));

// Inject session user into views
app.use(injectUser);

// Inject site settings + categories into all views
app.use((req, res, next) => {
  const settingsRows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  settingsRows.forEach(r => settings[r.key] = r.value);
  res.locals.site = settings;
  res.locals.categories = db.prepare('SELECT * FROM tour_categories ORDER BY sort_order, name').all();
  res.locals.bikesNav = db.prepare('SELECT id, name, slug FROM bikes WHERE status=1 ORDER BY name').all();
  res.locals.currentPath = req.path;
  next();
});

// Routes
app.use('/', require('./routes/public'));
app.use('/admin', require('./routes/admin'));

// 404
app.use((req, res) => {
  res.status(404).render('public/404', { title: 'Page Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('public/error', { title: 'Server Error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`\n🏍  Bali Adventure Moto Tours running at http://localhost:${PORT}`);
  console.log(`   Admin panel: http://localhost:${PORT}/admin/login`);
  console.log(`   Default login: admin / admin123\n`);
});
