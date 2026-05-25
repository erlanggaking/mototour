const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const slugify = require('slugify');
const db = require('../models/db');
const { requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

function slug(s) { return slugify(s || '', { lower: true, strict: true }); }
function ensureUniqueSlug(table, base, excludeId = null) {
  let s = base || 'item';
  let i = 1;
  while (true) {
    const row = excludeId
      ? db.prepare(`SELECT id FROM ${table} WHERE slug=? AND id<>?`).get(s, excludeId)
      : db.prepare(`SELECT id FROM ${table} WHERE slug=?`).get(s);
    if (!row) return s;
    s = `${base}-${++i}`;
  }
}

// ===== AUTH =====
router.get('/login', (req, res) => {
  if (req.session?.user) return res.redirect('/admin');
  res.render('admin/login', { title: 'Admin Login', error: null, layout: false });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  if (!user || !bcrypt.compareSync(password || '', user.password)) {
    return res.render('admin/login', { title: 'Admin Login', error: 'Invalid username or password.', layout: false });
  }
  req.session.user = { id: user.id, username: user.username, full_name: user.full_name, role: user.role };
  res.redirect('/admin');
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// All routes below require admin
router.use(requireAdmin);

// ===== DASHBOARD =====
router.get('/', (req, res) => {
  const stats = {
    tours: db.prepare('SELECT COUNT(*) c FROM tours').get().c,
    bikes: db.prepare('SELECT COUNT(*) c FROM bikes').get().c,
    posts: db.prepare('SELECT COUNT(*) c FROM posts').get().c,
    bookings: db.prepare('SELECT COUNT(*) c FROM bookings').get().c,
    new_bookings: db.prepare(`SELECT COUNT(*) c FROM bookings WHERE status='new'`).get().c,
    contacts: db.prepare('SELECT COUNT(*) c FROM contacts').get().c,
    new_contacts: db.prepare(`SELECT COUNT(*) c FROM contacts WHERE status='new'`).get().c,
    categories: db.prepare('SELECT COUNT(*) c FROM tour_categories').get().c
  };
  const recentBookings = db.prepare(`
    SELECT b.*, t.title as tour_title FROM bookings b
    LEFT JOIN tours t ON t.id = b.tour_id
    ORDER BY b.created_at DESC LIMIT 5
  `).all();
  const recentContacts = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC LIMIT 5').all();
  res.render('admin/dashboard', { title: 'Dashboard', stats, recentBookings, recentContacts });
});

// ===== CATEGORIES =====
router.get('/categories', (req, res) => {
  const cats = db.prepare('SELECT * FROM tour_categories ORDER BY sort_order, name').all();
  res.render('admin/categories', { title: 'Tour Categories', cats });
});

router.get('/categories/new', (req, res) => {
  res.render('admin/category-form', { title: 'New Category', cat: null });
});

router.post('/categories/new', upload.single('image'), (req, res) => {
  const { name, description, sort_order } = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : '';
  const s = ensureUniqueSlug('tour_categories', slug(name));
  db.prepare('INSERT INTO tour_categories (name, slug, description, image, sort_order) VALUES (?,?,?,?,?)')
    .run(name, s, description || '', image, parseInt(sort_order) || 0);
  res.redirect('/admin/categories');
});

router.get('/categories/:id/edit', (req, res) => {
  const cat = db.prepare('SELECT * FROM tour_categories WHERE id=?').get(req.params.id);
  if (!cat) return res.redirect('/admin/categories');
  res.render('admin/category-form', { title: 'Edit Category', cat });
});

router.post('/categories/:id/edit', upload.single('image'), (req, res) => {
  const { name, description, sort_order } = req.body;
  const cat = db.prepare('SELECT * FROM tour_categories WHERE id=?').get(req.params.id);
  if (!cat) return res.redirect('/admin/categories');
  const image = req.file ? '/uploads/' + req.file.filename : cat.image;
  const s = name !== cat.name ? ensureUniqueSlug('tour_categories', slug(name), cat.id) : cat.slug;
  db.prepare('UPDATE tour_categories SET name=?, slug=?, description=?, image=?, sort_order=? WHERE id=?')
    .run(name, s, description || '', image, parseInt(sort_order) || 0, cat.id);
  res.redirect('/admin/categories');
});

router.post('/categories/:id/delete', (req, res) => {
  db.prepare('DELETE FROM tour_categories WHERE id=?').run(req.params.id);
  res.redirect('/admin/categories');
});

// ===== TOURS =====
router.get('/tours', (req, res) => {
  const tours = db.prepare(`
    SELECT t.*, c.name as category_name FROM tours t
    LEFT JOIN tour_categories c ON c.id = t.category_id
    ORDER BY t.created_at DESC
  `).all();
  res.render('admin/tours', { title: 'Tours', tours });
});

router.get('/tours/new', (req, res) => {
  const categories = db.prepare('SELECT * FROM tour_categories ORDER BY name').all();
  res.render('admin/tour-form', { title: 'New Tour', tour: null, categories });
});

router.post('/tours/new', upload.single('image'), (req, res) => {
  const b = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : '';
  const s = ensureUniqueSlug('tours', slug(b.title));

  // Build itinerary array
  const itinerary = [];
  if (b.itinerary_day && Array.isArray(b.itinerary_day)) {
    for (let i = 0; i < b.itinerary_day.length; i++) {
      itinerary.push({
        day: parseInt(b.itinerary_day[i]) || (i + 1),
        title: b.itinerary_title[i] || `Day ${i + 1}`,
        description: b.itinerary_desc[i] || ''
      });
    }
  }
  const inclusions = (b.inclusions || '').split('\n').map(l => l.trim()).filter(Boolean);
  const exclusions = (b.exclusions || '').split('\n').map(l => l.trim()).filter(Boolean);

  db.prepare(`INSERT INTO tours (
    title, slug, category_id, short_description, description, itinerary, inclusions, exclusions,
    duration_days, price, difficulty, group_size, start_location, end_location, image, gallery,
    featured, is_group_tour, group_date, status
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    b.title, s, b.category_id || null, b.short_description || '', b.description || '',
    JSON.stringify(itinerary), JSON.stringify(inclusions), JSON.stringify(exclusions),
    parseInt(b.duration_days) || 1, parseFloat(b.price) || 0,
    b.difficulty || '', b.group_size || '', b.start_location || '', b.end_location || '',
    image, JSON.stringify([image].filter(Boolean)),
    b.featured ? 1 : 0, b.is_group_tour ? 1 : 0, b.group_date || '',
    b.status === undefined ? 1 : (b.status ? 1 : 0)
  );
  res.redirect('/admin/tours');
});

router.get('/tours/:id/edit', (req, res) => {
  const tour = db.prepare('SELECT * FROM tours WHERE id=?').get(req.params.id);
  if (!tour) return res.redirect('/admin/tours');
  try { tour.itinerary = JSON.parse(tour.itinerary || '[]'); } catch { tour.itinerary = []; }
  try { tour.inclusions = JSON.parse(tour.inclusions || '[]'); } catch { tour.inclusions = []; }
  try { tour.exclusions = JSON.parse(tour.exclusions || '[]'); } catch { tour.exclusions = []; }
  const categories = db.prepare('SELECT * FROM tour_categories ORDER BY name').all();
  res.render('admin/tour-form', { title: 'Edit Tour', tour, categories });
});

router.post('/tours/:id/edit', upload.single('image'), (req, res) => {
  const tour = db.prepare('SELECT * FROM tours WHERE id=?').get(req.params.id);
  if (!tour) return res.redirect('/admin/tours');
  const b = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : tour.image;
  const s = b.title !== tour.title ? ensureUniqueSlug('tours', slug(b.title), tour.id) : tour.slug;

  const itinerary = [];
  if (b.itinerary_day && Array.isArray(b.itinerary_day)) {
    for (let i = 0; i < b.itinerary_day.length; i++) {
      itinerary.push({
        day: parseInt(b.itinerary_day[i]) || (i + 1),
        title: b.itinerary_title[i] || `Day ${i + 1}`,
        description: b.itinerary_desc[i] || ''
      });
    }
  }
  const inclusions = (b.inclusions || '').split('\n').map(l => l.trim()).filter(Boolean);
  const exclusions = (b.exclusions || '').split('\n').map(l => l.trim()).filter(Boolean);

  db.prepare(`UPDATE tours SET
    title=?, slug=?, category_id=?, short_description=?, description=?, itinerary=?,
    inclusions=?, exclusions=?, duration_days=?, price=?, difficulty=?, group_size=?,
    start_location=?, end_location=?, image=?, gallery=?, featured=?, is_group_tour=?,
    group_date=?, status=? WHERE id=?`).run(
    b.title, s, b.category_id || null, b.short_description || '', b.description || '',
    JSON.stringify(itinerary), JSON.stringify(inclusions), JSON.stringify(exclusions),
    parseInt(b.duration_days) || 1, parseFloat(b.price) || 0,
    b.difficulty || '', b.group_size || '', b.start_location || '', b.end_location || '',
    image, JSON.stringify([image].filter(Boolean)),
    b.featured ? 1 : 0, b.is_group_tour ? 1 : 0, b.group_date || '',
    b.status ? 1 : 0, tour.id
  );
  res.redirect('/admin/tours');
});

router.post('/tours/:id/delete', (req, res) => {
  db.prepare('DELETE FROM tours WHERE id=?').run(req.params.id);
  res.redirect('/admin/tours');
});

// ===== BIKES =====
router.get('/bikes', (req, res) => {
  const bikes = db.prepare('SELECT * FROM bikes ORDER BY name').all();
  res.render('admin/bikes', { title: 'Bikes', bikes });
});

router.get('/bikes/new', (req, res) => {
  res.render('admin/bike-form', { title: 'New Bike', bike: null });
});

router.post('/bikes/new', upload.single('image'), (req, res) => {
  const b = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : '';
  const s = ensureUniqueSlug('bikes', slug(b.name));
  const specs = { Engine: b.cc, Type: b.type, Brand: b.brand };
  db.prepare(`INSERT INTO bikes (name, slug, brand, cc, type, description, specs, daily_rate, image, status)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
    b.name, s, b.brand || '', b.cc || '', b.type || '', b.description || '',
    JSON.stringify(specs), parseFloat(b.daily_rate) || 0, image, b.status ? 1 : 0
  );
  res.redirect('/admin/bikes');
});

router.get('/bikes/:id/edit', (req, res) => {
  const bike = db.prepare('SELECT * FROM bikes WHERE id=?').get(req.params.id);
  if (!bike) return res.redirect('/admin/bikes');
  res.render('admin/bike-form', { title: 'Edit Bike', bike });
});

router.post('/bikes/:id/edit', upload.single('image'), (req, res) => {
  const bike = db.prepare('SELECT * FROM bikes WHERE id=?').get(req.params.id);
  if (!bike) return res.redirect('/admin/bikes');
  const b = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : bike.image;
  const s = b.name !== bike.name ? ensureUniqueSlug('bikes', slug(b.name), bike.id) : bike.slug;
  const specs = { Engine: b.cc, Type: b.type, Brand: b.brand };
  db.prepare(`UPDATE bikes SET name=?, slug=?, brand=?, cc=?, type=?, description=?, specs=?, daily_rate=?, image=?, status=? WHERE id=?`)
    .run(b.name, s, b.brand || '', b.cc || '', b.type || '', b.description || '',
      JSON.stringify(specs), parseFloat(b.daily_rate) || 0, image, b.status ? 1 : 0, bike.id);
  res.redirect('/admin/bikes');
});

router.post('/bikes/:id/delete', (req, res) => {
  db.prepare('DELETE FROM bikes WHERE id=?').run(req.params.id);
  res.redirect('/admin/bikes');
});

// ===== POSTS (Blog) =====
router.get('/posts', (req, res) => {
  const posts = db.prepare('SELECT * FROM posts ORDER BY created_at DESC').all();
  res.render('admin/posts', { title: 'Travel Guides', posts });
});

router.get('/posts/new', (req, res) => {
  res.render('admin/post-form', { title: 'New Post', post: null });
});

router.post('/posts/new', upload.single('image'), (req, res) => {
  const b = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : '';
  const s = ensureUniqueSlug('posts', slug(b.title));
  db.prepare(`INSERT INTO posts (title, slug, excerpt, content, image, author, tags, status)
    VALUES (?,?,?,?,?,?,?,?)`).run(
    b.title, s, b.excerpt || '', b.content || '', image, b.author || 'Admin', b.tags || '', b.status ? 1 : 0
  );
  res.redirect('/admin/posts');
});

router.get('/posts/:id/edit', (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.id);
  if (!post) return res.redirect('/admin/posts');
  res.render('admin/post-form', { title: 'Edit Post', post });
});

router.post('/posts/:id/edit', upload.single('image'), (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.id);
  if (!post) return res.redirect('/admin/posts');
  const b = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : post.image;
  const s = b.title !== post.title ? ensureUniqueSlug('posts', slug(b.title), post.id) : post.slug;
  db.prepare(`UPDATE posts SET title=?, slug=?, excerpt=?, content=?, image=?, author=?, tags=?, status=? WHERE id=?`)
    .run(b.title, s, b.excerpt || '', b.content || '', image, b.author || 'Admin', b.tags || '', b.status ? 1 : 0, post.id);
  res.redirect('/admin/posts');
});

router.post('/posts/:id/delete', (req, res) => {
  db.prepare('DELETE FROM posts WHERE id=?').run(req.params.id);
  res.redirect('/admin/posts');
});

// ===== TEAM =====
router.get('/team', (req, res) => {
  const team = db.prepare('SELECT * FROM team_members ORDER BY sort_order').all();
  res.render('admin/team', { title: 'Team Members', team });
});

router.get('/team/new', (req, res) => {
  res.render('admin/team-form', { title: 'New Member', member: null });
});

router.post('/team/new', upload.single('image'), (req, res) => {
  const b = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : '';
  db.prepare('INSERT INTO team_members (name, position, bio, image, sort_order) VALUES (?,?,?,?,?)')
    .run(b.name, b.position || '', b.bio || '', image, parseInt(b.sort_order) || 0);
  res.redirect('/admin/team');
});

router.get('/team/:id/edit', (req, res) => {
  const member = db.prepare('SELECT * FROM team_members WHERE id=?').get(req.params.id);
  if (!member) return res.redirect('/admin/team');
  res.render('admin/team-form', { title: 'Edit Member', member });
});

router.post('/team/:id/edit', upload.single('image'), (req, res) => {
  const m = db.prepare('SELECT * FROM team_members WHERE id=?').get(req.params.id);
  if (!m) return res.redirect('/admin/team');
  const b = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : m.image;
  db.prepare('UPDATE team_members SET name=?, position=?, bio=?, image=?, sort_order=? WHERE id=?')
    .run(b.name, b.position || '', b.bio || '', image, parseInt(b.sort_order) || 0, m.id);
  res.redirect('/admin/team');
});

router.post('/team/:id/delete', (req, res) => {
  db.prepare('DELETE FROM team_members WHERE id=?').run(req.params.id);
  res.redirect('/admin/team');
});

// ===== TESTIMONIALS =====
router.get('/testimonials', (req, res) => {
  const items = db.prepare('SELECT * FROM testimonials ORDER BY id DESC').all();
  res.render('admin/testimonials', { title: 'Testimonials', items });
});

router.get('/testimonials/new', (req, res) => {
  res.render('admin/testimonial-form', { title: 'New Testimonial', item: null });
});

router.post('/testimonials/new', upload.single('image'), (req, res) => {
  const b = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : '';
  db.prepare('INSERT INTO testimonials (name, country, rating, content, image, status) VALUES (?,?,?,?,?,?)')
    .run(b.name, b.country || '', parseInt(b.rating) || 5, b.content || '', image, b.status ? 1 : 0);
  res.redirect('/admin/testimonials');
});

router.get('/testimonials/:id/edit', (req, res) => {
  const item = db.prepare('SELECT * FROM testimonials WHERE id=?').get(req.params.id);
  if (!item) return res.redirect('/admin/testimonials');
  res.render('admin/testimonial-form', { title: 'Edit Testimonial', item });
});

router.post('/testimonials/:id/edit', upload.single('image'), (req, res) => {
  const it = db.prepare('SELECT * FROM testimonials WHERE id=?').get(req.params.id);
  if (!it) return res.redirect('/admin/testimonials');
  const b = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : it.image;
  db.prepare('UPDATE testimonials SET name=?, country=?, rating=?, content=?, image=?, status=? WHERE id=?')
    .run(b.name, b.country || '', parseInt(b.rating) || 5, b.content || '', image, b.status ? 1 : 0, it.id);
  res.redirect('/admin/testimonials');
});

router.post('/testimonials/:id/delete', (req, res) => {
  db.prepare('DELETE FROM testimonials WHERE id=?').run(req.params.id);
  res.redirect('/admin/testimonials');
});

// ===== BOOKINGS =====
router.get('/bookings', (req, res) => {
  const bookings = db.prepare(`
    SELECT b.*, t.title as tour_title FROM bookings b
    LEFT JOIN tours t ON t.id = b.tour_id
    ORDER BY b.created_at DESC
  `).all();
  res.render('admin/bookings', { title: 'Bookings', bookings });
});

router.get('/bookings/:id', (req, res) => {
  const booking = db.prepare(`
    SELECT b.*, t.title as tour_title FROM bookings b
    LEFT JOIN tours t ON t.id = b.tour_id
    WHERE b.id=?
  `).get(req.params.id);
  if (!booking) return res.redirect('/admin/bookings');
  res.render('admin/booking-detail', { title: `Booking #${booking.id}`, booking });
});

router.post('/bookings/:id/status', (req, res) => {
  db.prepare('UPDATE bookings SET status=? WHERE id=?').run(req.body.status, req.params.id);
  res.redirect('/admin/bookings/' + req.params.id);
});

router.post('/bookings/:id/delete', (req, res) => {
  db.prepare('DELETE FROM bookings WHERE id=?').run(req.params.id);
  res.redirect('/admin/bookings');
});

// ===== CONTACTS =====
router.get('/contacts', (req, res) => {
  const contacts = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();
  res.render('admin/contacts', { title: 'Contact Messages', contacts });
});

router.get('/contacts/:id', (req, res) => {
  const contact = db.prepare('SELECT * FROM contacts WHERE id=?').get(req.params.id);
  if (!contact) return res.redirect('/admin/contacts');
  db.prepare(`UPDATE contacts SET status='read' WHERE id=? AND status='new'`).run(contact.id);
  res.render('admin/contact-detail', { title: `Message #${contact.id}`, contact });
});

router.post('/contacts/:id/delete', (req, res) => {
  db.prepare('DELETE FROM contacts WHERE id=?').run(req.params.id);
  res.redirect('/admin/contacts');
});

// ===== SETTINGS =====
router.get('/settings', (req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all();
  const data = {};
  rows.forEach(r => data[r.key] = r.value);
  res.render('admin/settings', { title: 'Site Settings', data });
});

router.post('/settings', (req, res) => {
  const upd = db.prepare('UPDATE settings SET value=? WHERE key=?');
  const ins = db.prepare('INSERT INTO settings (key, value) VALUES (?,?)');
  Object.keys(req.body).forEach(k => {
    const exists = db.prepare('SELECT key FROM settings WHERE key=?').get(k);
    if (exists) upd.run(req.body[k] || '', k);
    else ins.run(k, req.body[k] || '');
  });
  res.redirect('/admin/settings');
});

// ===== USERS =====
router.get('/users', (req, res) => {
  const users = db.prepare('SELECT id, username, full_name, role, created_at FROM users ORDER BY id').all();
  res.render('admin/users', { title: 'Admin Users', users });
});

router.post('/users/new', (req, res) => {
  const { username, password, full_name } = req.body;
  if (!username || !password) return res.redirect('/admin/users');
  const existing = db.prepare('SELECT id FROM users WHERE username=?').get(username);
  if (existing) return res.redirect('/admin/users');
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (username, password, full_name, role) VALUES (?,?,?,?)')
    .run(username, hash, full_name || '', 'admin');
  res.redirect('/admin/users');
});

router.post('/users/:id/password', (req, res) => {
  const { password } = req.body;
  if (password) {
    db.prepare('UPDATE users SET password=? WHERE id=?').run(bcrypt.hashSync(password, 10), req.params.id);
  }
  res.redirect('/admin/users');
});

router.post('/users/:id/delete', (req, res) => {
  if (parseInt(req.params.id) === req.session.user.id) return res.redirect('/admin/users');
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.redirect('/admin/users');
});

module.exports = router;
