const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Helper
function safeParse(json, fallback) {
  try { return JSON.parse(json); } catch { return fallback; }
}

// HOME
router.get('/', (req, res) => {
  const featuredTours = db.prepare(`
    SELECT t.*, c.name as category_name FROM tours t
    LEFT JOIN tour_categories c ON c.id = t.category_id
    WHERE t.featured = 1 AND t.status = 1 AND (t.is_group_tour = 0 OR t.is_group_tour IS NULL)
    ORDER BY t.created_at DESC LIMIT 6
  `).all();

  const allTours = db.prepare(`
    SELECT t.*, c.name as category_name FROM tours t
    LEFT JOIN tour_categories c ON c.id = t.category_id
    WHERE t.status = 1 AND (t.is_group_tour = 0 OR t.is_group_tour IS NULL)
    ORDER BY t.created_at DESC LIMIT 8
  `).all();

  const bikes = db.prepare('SELECT * FROM bikes WHERE status=1 ORDER BY daily_rate LIMIT 6').all();
  const posts = db.prepare('SELECT * FROM posts WHERE status=1 ORDER BY created_at DESC LIMIT 3').all();
  const testimonials = db.prepare('SELECT * FROM testimonials WHERE status=1 ORDER BY id DESC LIMIT 6').all();
  const team = db.prepare('SELECT * FROM team_members ORDER BY sort_order LIMIT 4').all();

  res.render('public/home', {
    title: res.locals.site.site_name || 'Bali Adventure Moto Tours',
    featuredTours, allTours, bikes, posts, testimonials, team
  });
});

// TOURS LISTING (all)
router.get('/tours', (req, res) => {
  const tours = db.prepare(`
    SELECT t.*, c.name as category_name, c.slug as category_slug FROM tours t
    LEFT JOIN tour_categories c ON c.id = t.category_id
    WHERE t.status = 1 AND (t.is_group_tour = 0 OR t.is_group_tour IS NULL)
    ORDER BY t.created_at DESC
  `).all();
  res.render('public/tours', { title: 'All Motorbike Tours', tours, currentCategory: null });
});

// TOURS BY CATEGORY
router.get('/tours/:slug', (req, res) => {
  const cat = db.prepare('SELECT * FROM tour_categories WHERE slug=?').get(req.params.slug);
  if (!cat) return res.status(404).render('public/404', { title: 'Not Found' });
  const tours = db.prepare(`
    SELECT t.*, c.name as category_name FROM tours t
    LEFT JOIN tour_categories c ON c.id = t.category_id
    WHERE t.status=1 AND t.category_id=?
    ORDER BY t.created_at DESC
  `).all(cat.id);
  res.render('public/tours', { title: cat.name, tours, currentCategory: cat });
});

// TOUR DETAIL
router.get('/tour/:slug', (req, res) => {
  const tour = db.prepare(`
    SELECT t.*, c.name as category_name, c.slug as category_slug FROM tours t
    LEFT JOIN tour_categories c ON c.id = t.category_id
    WHERE t.slug = ?
  `).get(req.params.slug);
  if (!tour) return res.status(404).render('public/404', { title: 'Not Found' });

  tour.itinerary = safeParse(tour.itinerary, []);
  tour.inclusions = safeParse(tour.inclusions, []);
  tour.exclusions = safeParse(tour.exclusions, []);
  tour.gallery = safeParse(tour.gallery, []);

  const related = db.prepare(`
    SELECT * FROM tours WHERE category_id=? AND id<>? AND status=1 LIMIT 3
  `).all(tour.category_id, tour.id);

  res.render('public/tour-detail', { title: tour.title, tour, related });
});

// GROUP TOURS
router.get('/group-tours', (req, res) => {
  const tours = db.prepare(`
    SELECT * FROM tours WHERE is_group_tour=1 AND status=1 ORDER BY group_date ASC
  `).all();
  res.render('public/group-tours', { title: 'Join a Group Tour', tours });
});

// BIG BIKE TOURS (shortcut to category)
router.get('/big-bike-tours', (req, res) => {
  const cat = db.prepare(`SELECT * FROM tour_categories WHERE slug='big-bike-tours'`).get();
  const tours = cat ? db.prepare(`SELECT * FROM tours WHERE category_id=? AND status=1`).all(cat.id) : [];
  res.render('public/tours', { title: 'Big Bike Tours', tours, currentCategory: cat });
});

// BIKES
router.get('/our-bikes', (req, res) => {
  const bikes = db.prepare('SELECT * FROM bikes WHERE status=1 ORDER BY daily_rate').all();
  res.render('public/bikes', { title: 'Our Bikes', bikes });
});

router.get('/bike/:slug', (req, res) => {
  const bike = db.prepare('SELECT * FROM bikes WHERE slug=?').get(req.params.slug);
  if (!bike) return res.status(404).render('public/404', { title: 'Not Found' });
  bike.specs = safeParse(bike.specs, {});
  res.render('public/bike-detail', { title: bike.name, bike });
});

// BLOG / TRAVEL GUIDES
router.get('/blog', (req, res) => {
  const posts = db.prepare('SELECT * FROM posts WHERE status=1 ORDER BY created_at DESC').all();
  res.render('public/blog', { title: 'Travel Guides', posts });
});

router.get('/blog/:slug', (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE slug=?').get(req.params.slug);
  if (!post) return res.status(404).render('public/404', { title: 'Not Found' });
  const related = db.prepare('SELECT * FROM posts WHERE id<>? AND status=1 ORDER BY created_at DESC LIMIT 3').all(post.id);
  res.render('public/post-detail', { title: post.title, post, related });
});

// ABOUT
router.get('/about-us', (req, res) => {
  res.render('public/about', { title: 'About Us' });
});

// TEAM
router.get('/our-team', (req, res) => {
  const team = db.prepare('SELECT * FROM team_members ORDER BY sort_order').all();
  res.render('public/team', { title: 'Our Team', team });
});

// CONTACT
router.get('/contact-us', (req, res) => {
  res.render('public/contact', { title: 'Contact Us', success: false });
});

router.post('/contact-us', (req, res) => {
  const { full_name, email, phone, subject, message } = req.body;
  if (!full_name || !email || !message) {
    return res.render('public/contact', { title: 'Contact Us', success: false, error: 'Please fill in all required fields.' });
  }
  db.prepare(`INSERT INTO contacts (full_name, email, phone, subject, message) VALUES (?,?,?,?,?)`)
    .run(full_name, email, phone || '', subject || '', message);
  res.render('public/contact', { title: 'Contact Us', success: true });
});

// BOOKING
router.get('/booking', (req, res) => {
  const tours = db.prepare(`SELECT id, title FROM tours WHERE status=1 ORDER BY title`).all();
  const tourId = req.query.tour ? parseInt(req.query.tour) : null;
  res.render('public/booking', { title: 'Book a Tour', tours, tourId, success: false });
});

router.post('/booking', (req, res) => {
  const { tour_id, full_name, email, phone, country, travel_date, num_people, message } = req.body;
  if (!full_name || !email) {
    const tours = db.prepare(`SELECT id, title FROM tours WHERE status=1 ORDER BY title`).all();
    return res.render('public/booking', { title: 'Book a Tour', tours, tourId: tour_id, success: false, error: 'Name and email are required.' });
  }
  db.prepare(`INSERT INTO bookings (tour_id, full_name, email, phone, country, travel_date, num_people, message)
    VALUES (?,?,?,?,?,?,?,?)`).run(
    tour_id || null, full_name, email, phone || '', country || '',
    travel_date || '', num_people || 1, message || ''
  );
  const tours = db.prepare(`SELECT id, title FROM tours WHERE status=1 ORDER BY title`).all();
  res.render('public/booking', { title: 'Booking Received', tours, tourId: null, success: true });
});

// SEARCH
router.get('/search', (req, res) => {
  const q = (req.query.q || '').trim();
  let tours = [];
  if (q) {
    tours = db.prepare(`SELECT * FROM tours WHERE status=1 AND (title LIKE ? OR description LIKE ? OR short_description LIKE ?)`)
      .all(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  res.render('public/search', { title: `Search: ${q}`, q, tours });
});

module.exports = router;
