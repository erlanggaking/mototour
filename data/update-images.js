// Updates image URLs in the database with real, relevant photos.
// Safe to re-run anytime — only matches by slug/name/title.
// Sources: Unsplash CDN (free, hot-linked) + i.pravatar.cc (avatars).

const db = require('../models/db');

const UNSPLASH = (id, w = 800) => `https://images.unsplash.com/photo-${id}?w=${w}&q=75&auto=format&fit=crop`;

// ----- TOUR CATEGORIES -----
const categoryImages = {
  'motorbike-tours':            UNSPLASH('1604999333679-b86d54738315', 800),
  'mount-batur-sunrise-ride':   UNSPLASH('1525498128493-380d1990a112', 800),
  'east-bali-explorer':         UNSPLASH('1568772585407-9361f9bf3a87', 800),
  'north-bali-waterfall-tour':  UNSPLASH('1542228262-3d663b306a53', 800),
  'west-bali-national-park':    UNSPLASH('1545048702-79362596cdc9', 800),
  'off-road-thrills':           UNSPLASH('1558981852-426c6c22a060', 800),
  'on-road-adventures':         UNSPLASH('1483721310020-03333e577078', 800),
  'big-bike-tours':             UNSPLASH('1547549082-6bc09f2049ae', 800)
};

// ----- TOURS (matched by slug prefix or category) -----
const tourImages = {
  // Featured / regular tours
  'ultimate-bali-loop-7-days':           UNSPLASH('1539367628448-4bc5c9d171c8', 1200),
  'mount-batur-sunrise-ride-1-day':      UNSPLASH('1525498128493-380d1990a112', 1200),
  'east-bali-explorer-3-days':           UNSPLASH('1568772585407-9361f9bf3a87', 1200),
  'north-bali-waterfall-tour-2-days':    UNSPLASH('1542228262-3d663b306a53', 1200),
  'west-bali-national-park-4-days':      UNSPLASH('1545048702-79362596cdc9', 1200),
  'off-road-mountain-thrills-1-day':     UNSPLASH('1558981852-426c6c22a060', 1200),
  'ubud-countryside-on-road-1-day':      UNSPLASH('1502086223501-7ea6ecd79368', 1200),
  'bali-big-bike-coastal-run-2-days':    UNSPLASH('1547549082-6bc09f2049ae', 1200)
};

// Default group tour image
const groupTourImage = UNSPLASH('1599819811279-d5ad9cccf838', 1200);

// ----- BIKES -----
const bikeImages = {
  'honda-crf-250l':                  UNSPLASH('1558981403-c5f9899a28bc', 800),
  'honda-crf-300l-rally':            UNSPLASH('1604999333679-b86d54738315', 800),
  'kawasaki-klx-230':                UNSPLASH('1611348586804-61bf6c080437', 800),
  'yamaha-wr-155':                   UNSPLASH('1558979158-65a1eaa08691', 800),
  'yamaha-xsr-155':                  UNSPLASH('1517490232338-06b912a786b5', 800),
  'bmw-g-310-gs':                    UNSPLASH('1601925260368-ae2f83cf8b7f', 800),
  'triumph-scrambler-400x':          UNSPLASH('1601758228041-f3b2795255f1', 800),
  'royal-enfield-himalayan-450':     UNSPLASH('1622547748225-3fc4abd2cca0', 800)
};

// ----- BLOG POSTS -----
const postImages = {
  'best-time-to-ride-a-motorbike-in-bali':    UNSPLASH('1571068316344-75bc76f77890', 1000),
  'top-10-motorbike-routes-in-bali':          UNSPLASH('1483721310020-03333e577078', 1000),
  'do-you-need-a-license-to-ride-in-bali':    UNSPLASH('1547549082-6bc09f2049ae', 1000),
  'what-to-pack-for-a-multi-day-bali-ride':   UNSPLASH('1545048702-79362596cdc9', 1000)
};

// ----- TEAM -----  (seeded avatars)
const teamImages = {
  'Made Wirawan': 'https://i.pravatar.cc/400?u=made-wirawan',
  'Wayan Putra':  'https://i.pravatar.cc/400?u=wayan-putra',
  'Komang Adi':   'https://i.pravatar.cc/400?u=komang-adi',
  'Ketut Sari':   'https://i.pravatar.cc/400?u=ketut-sari'
};

// ----- TESTIMONIALS -----
const testimonialImages = {
  'James Carter':  'https://i.pravatar.cc/200?u=james-carter',
  'Sophie Müller': 'https://i.pravatar.cc/200?u=sophie-muller',
  'David Tan':     'https://i.pravatar.cc/200?u=david-tan',
  'Emma Wilson':   'https://i.pravatar.cc/200?u=emma-wilson'
};

// ===== APPLY UPDATES =====
let updated = 0;

const updCat = db.prepare('UPDATE tour_categories SET image=? WHERE slug=?');
Object.entries(categoryImages).forEach(([slug, url]) => {
  const r = updCat.run(url, slug);
  if (r.changes) updated++;
});
console.log(`✓ Categories updated`);

const updTourSlug = db.prepare('UPDATE tours SET image=?, gallery=? WHERE slug=?');
Object.entries(tourImages).forEach(([slug, url]) => {
  const r = updTourSlug.run(url, JSON.stringify([url]), slug);
  if (r.changes) updated++;
});

// Group tours: any tour with is_group_tour=1
const updGroupTours = db.prepare(`UPDATE tours SET image=?, gallery=? WHERE is_group_tour=1`);
updGroupTours.run(groupTourImage, JSON.stringify([groupTourImage]));
console.log(`✓ Tours updated`);

const updBike = db.prepare('UPDATE bikes SET image=? WHERE slug=?');
Object.entries(bikeImages).forEach(([slug, url]) => {
  const r = updBike.run(url, slug);
  if (r.changes) updated++;
});
console.log(`✓ Bikes updated`);

const updPost = db.prepare('UPDATE posts SET image=? WHERE slug=?');
Object.entries(postImages).forEach(([slug, url]) => {
  const r = updPost.run(url, slug);
  if (r.changes) updated++;
});
console.log(`✓ Posts updated`);

const updTeam = db.prepare('UPDATE team_members SET image=? WHERE name=?');
Object.entries(teamImages).forEach(([name, url]) => {
  const r = updTeam.run(url, name);
  if (r.changes) updated++;
});
console.log(`✓ Team updated`);

const updTest = db.prepare('UPDATE testimonials SET image=? WHERE name=?');
Object.entries(testimonialImages).forEach(([name, url]) => {
  const r = updTest.run(url, name);
  if (r.changes) updated++;
});
console.log(`✓ Testimonials updated`);

console.log(`\n✅ Image update complete (${updated} rows changed).\n`);
