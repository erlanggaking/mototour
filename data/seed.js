require('dotenv').config();
const db = require('../models/db');
const bcrypt = require('bcryptjs');
const slugify = require('slugify');

function slug(s) { return slugify(s, { lower: true, strict: true }); }

// Clear (optional) - keep idempotent: only seed if empty
const userCount = db.prepare('SELECT COUNT(*) c FROM users').get().c;
if (userCount === 0) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password, full_name, role) VALUES (?,?,?,?)').run('admin', hash, 'Administrator', 'admin');
  console.log('✓ Admin user created (username: admin / password: admin123)');
}

const catCount = db.prepare('SELECT COUNT(*) c FROM tour_categories').get().c;
if (catCount === 0) {
  const cats = [
    { name: 'Motorbike Tours', desc: 'All motorbike adventures across Bali', img: '/images/cat-motorbike.jpg' },
    { name: 'Mount Batur Sunrise Ride', desc: 'Sunrise at Mount Batur on a motorbike', img: '/images/cat-batur.jpg' },
    { name: 'East Bali Explorer', desc: 'Eastern Bali villages and beaches', img: '/images/cat-east.jpg' },
    { name: 'North Bali Waterfall Tour', desc: 'Hidden waterfalls of north Bali', img: '/images/cat-north.jpg' },
    { name: 'West Bali National Park', desc: 'Off-road through West Bali', img: '/images/cat-west.jpg' },
    { name: 'Off-Road Thrills', desc: 'Hardcore off-road tracks', img: '/images/cat-offroad.jpg' },
    { name: 'On-Road Adventures', desc: 'Smooth tarmac riding loops', img: '/images/cat-onroad.jpg' },
    { name: 'Big Bike Tours', desc: 'Bali on heavyweight bikes', img: '/images/cat-bigbike.jpg' }
  ];
  const ins = db.prepare('INSERT INTO tour_categories (name, slug, description, image, sort_order) VALUES (?,?,?,?,?)');
  cats.forEach((c, i) => ins.run(c.name, slug(c.name), c.desc, c.img, i));
  console.log('✓ Tour categories seeded');
}

const tourCount = db.prepare('SELECT COUNT(*) c FROM tours').get().c;
if (tourCount === 0) {
  const getCat = (n) => db.prepare('SELECT id FROM tour_categories WHERE name=?').get(n)?.id;
  const tours = [
    {
      title: 'Ultimate Bali Loop - 7 Days',
      cat: 'Motorbike Tours',
      short: 'A complete week-long ride covering Ubud, Mount Batur, Lovina, Munduk, and the southern beaches.',
      desc: 'Experience the very best of Bali on a comprehensive 7-day motorbike adventure. From volcanic peaks to hidden waterfalls, jungle trails, and ocean roads, this loop has it all. Ride with experienced local guides who know every corner of the island.',
      days: 7, price: 950, diff: 'Intermediate', size: '2-8 riders',
      start: 'Denpasar', end: 'Denpasar',
      img: '/images/tour-ultimate.jpg', featured: 1
    },
    {
      title: 'Mount Batur Sunrise Ride - 1 Day',
      cat: 'Mount Batur Sunrise Ride',
      short: 'Catch the sunrise at the rim of Mount Batur volcano on this thrilling early-morning ride.',
      desc: 'Wake up before dawn and ride through quiet villages up to the rim of Mount Batur. Watch the sunrise paint the sky over Lake Batur, then descend through coffee plantations on the way back.',
      days: 1, price: 95, diff: 'Easy', size: '1-6 riders',
      start: 'Ubud', end: 'Ubud',
      img: '/images/tour-batur.jpg', featured: 1
    },
    {
      title: 'East Bali Explorer - 3 Days',
      cat: 'East Bali Explorer',
      short: 'Discover the untouched east: Tirta Gangga, Amed, and the slopes of Mount Agung.',
      desc: 'A 3-day adventure into the cultural heart of East Bali. Visit royal water palaces, traditional Balinese villages, snorkel in Amed, and ride the dramatic roads around Mount Agung.',
      days: 3, price: 420, diff: 'Intermediate', size: '2-6 riders',
      start: 'Ubud', end: 'Candidasa',
      img: '/images/tour-east.jpg', featured: 1
    },
    {
      title: 'North Bali Waterfall Tour - 2 Days',
      cat: 'North Bali Waterfall Tour',
      short: 'Chase waterfalls through Munduk, Sekumpul, and Banyumala.',
      desc: 'Two days of jungle riding to some of Bali\'s most spectacular waterfalls. Sleep in a mountain village and wake up to misty rice fields and coffee plantations.',
      days: 2, price: 280, diff: 'Intermediate', size: '2-6 riders',
      start: 'Ubud', end: 'Lovina',
      img: '/images/tour-waterfall.jpg', featured: 0
    },
    {
      title: 'West Bali National Park - 4 Days',
      cat: 'West Bali National Park',
      short: 'Off-road through national park trails and remote fishing villages.',
      desc: 'Take the road less travelled into West Bali National Park. Wildlife, dirt trails, and pristine coastline make this a true adventure for off-road enthusiasts.',
      days: 4, price: 580, diff: 'Advanced', size: '2-5 riders',
      start: 'Denpasar', end: 'Pemuteran',
      img: '/images/tour-west.jpg', featured: 0
    },
    {
      title: 'Off-Road Mountain Thrills - 1 Day',
      cat: 'Off-Road Thrills',
      short: 'Hardcore single-track and dirt trails through Bali\'s highlands.',
      desc: 'For experienced riders only. We tackle steep, muddy, technical trails through coffee plantations and jungle, with river crossings and stunning rim viewpoints.',
      days: 1, price: 130, diff: 'Advanced', size: '1-4 riders',
      start: 'Kintamani', end: 'Kintamani',
      img: '/images/tour-offroad.jpg', featured: 1
    },
    {
      title: 'Ubud Countryside On-Road - 1 Day',
      cat: 'On-Road Adventures',
      short: 'A scenic loop through rice terraces, temples and artisan villages.',
      desc: 'A relaxed paved-road tour ideal for any rider. Visit Tegallalang rice terraces, Tirta Empul temple, and Tegenungan waterfall.',
      days: 1, price: 75, diff: 'Easy', size: '1-8 riders',
      start: 'Ubud', end: 'Ubud',
      img: '/images/tour-ubud.jpg', featured: 0
    },
    {
      title: 'Bali Big Bike Coastal Run - 2 Days',
      cat: 'Big Bike Tours',
      short: 'Cruise the southern coast on a big bike: BMW, Triumph or Harley.',
      desc: 'A two-day coastal cruise on premium big bikes. Sunset at Uluwatu, seafood at Jimbaran, and twisty mountain roads on day two.',
      days: 2, price: 540, diff: 'Intermediate', size: '2-4 riders',
      start: 'Denpasar', end: 'Denpasar',
      img: '/images/tour-bigbike.jpg', featured: 1
    }
  ];

  const ins = db.prepare(`INSERT INTO tours (
    title, slug, category_id, short_description, description, itinerary, inclusions, exclusions,
    duration_days, price, difficulty, group_size, start_location, end_location, image, gallery, featured,
    is_group_tour, group_date, status
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

  tours.forEach(t => {
    const itinerary = JSON.stringify(Array.from({ length: t.days }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1}`,
      description: `Detailed plan for day ${i + 1} of ${t.title}.`
    })));
    const inclusions = JSON.stringify([
      'Experienced English-speaking guide',
      'Quality motorbike (Honda CRF or equivalent)',
      'Helmet, gloves, riding gear',
      'Fuel for the entire trip',
      'Hotel accommodation (twin share)',
      'Daily breakfast and lunch',
      'Entrance fees to attractions'
    ]);
    const exclusions = JSON.stringify([
      'International flights',
      'Travel insurance',
      'Drinks and personal expenses',
      'Tips for guides'
    ]);
    ins.run(t.title, slug(t.title), getCat(t.cat), t.short, t.desc, itinerary, inclusions, exclusions,
      t.days, t.price, t.diff, t.size, t.start, t.end, t.img, JSON.stringify([t.img]), t.featured,
      0, '', 1);
  });

  // Group tours
  const groupMonths = ['2026-06-15', '2026-07-20', '2026-08-17', '2026-09-10', '2026-10-05'];
  groupMonths.forEach((d, i) => {
    const title = `Group Tour ${d.slice(0, 7)} - Bali Loop`;
    ins.run(
      title, slug(title + '-g' + i), getCat('Motorbike Tours'),
      'Join a fixed-date group ride through Bali with riders from around the world.',
      'Our group tours are perfect for solo riders who want to share the adventure. All-inclusive 6-day Bali loop.',
      JSON.stringify([]), JSON.stringify(['Bike', 'Guide', 'Hotel', 'Breakfast']), JSON.stringify(['Flights', 'Insurance']),
      6, 850, 'Intermediate', 'Max 8 riders', 'Denpasar', 'Denpasar',
      '/images/tour-group.jpg', JSON.stringify(['/images/tour-group.jpg']), 0, 1, d, 1
    );
  });

  console.log('✓ Tours seeded');
}

const bikeCount = db.prepare('SELECT COUNT(*) c FROM bikes').get().c;
if (bikeCount === 0) {
  const bikes = [
    { name: 'Honda CRF 250L', brand: 'Honda', cc: '250cc', type: 'Dual-Sport', rate: 25, img: '/images/bike-crf250.jpg' },
    { name: 'Honda CRF 300L Rally', brand: 'Honda', cc: '300cc', type: 'Adventure', rate: 35, img: '/images/bike-crf300.jpg' },
    { name: 'Kawasaki KLX 230', brand: 'Kawasaki', cc: '230cc', type: 'Dual-Sport', rate: 22, img: '/images/bike-klx.jpg' },
    { name: 'Yamaha WR 155', brand: 'Yamaha', cc: '155cc', type: 'Trail', rate: 18, img: '/images/bike-wr155.jpg' },
    { name: 'Yamaha XSR 155', brand: 'Yamaha', cc: '155cc', type: 'Retro', rate: 20, img: '/images/bike-xsr.jpg' },
    { name: 'BMW G 310 GS', brand: 'BMW', cc: '310cc', type: 'Adventure', rate: 55, img: '/images/bike-g310.jpg' },
    { name: 'Triumph Scrambler 400X', brand: 'Triumph', cc: '400cc', type: 'Scrambler', rate: 75, img: '/images/bike-scrambler.jpg' },
    { name: 'Royal Enfield Himalayan 450', brand: 'Royal Enfield', cc: '450cc', type: 'Adventure', rate: 65, img: '/images/bike-himalayan.jpg' }
  ];
  const ins = db.prepare(`INSERT INTO bikes (name, slug, brand, cc, type, description, specs, daily_rate, image)
    VALUES (?,?,?,?,?,?,?,?,?)`);
  bikes.forEach(b => {
    ins.run(b.name, slug(b.name), b.brand, b.cc, b.type,
      `The ${b.name} is a ${b.type} motorbike, perfect for exploring Bali. Reliable, well-maintained and serviced before every tour.`,
      JSON.stringify({ Engine: b.cc, Transmission: '6-speed', Fuel: '10-12L tank', Weight: '~145 kg', Type: b.type }),
      b.rate, b.img);
  });
  console.log('✓ Bikes seeded');
}

const postCount = db.prepare('SELECT COUNT(*) c FROM posts').get().c;
if (postCount === 0) {
  const posts = [
    {
      title: 'Best Time to Ride a Motorbike in Bali',
      excerpt: 'A complete month-by-month guide to the best riding seasons in Bali.',
      content: 'Bali has two main seasons: dry (April–October) and wet (November–March). The dry season is the best time for motorbike touring. Mornings are clear, roads are dry, and the views are unbeatable. Even during the wet season, riding is possible — rains usually come in short afternoon bursts.',
      image: '/images/blog-1.jpg', tags: 'guide,season,bali'
    },
    {
      title: 'Top 10 Motorbike Routes in Bali',
      excerpt: 'Our handpicked top 10 most scenic and exciting routes.',
      content: 'From the volcano rim of Mount Batur to the western coastal roads of Pemuteran, Bali offers a stunning variety of riding terrain. In this guide we cover our top 10 favourite routes, including hidden gems most tourists never see.',
      image: '/images/blog-2.jpg', tags: 'routes,top10'
    },
    {
      title: 'Do You Need a License to Ride in Bali?',
      excerpt: 'Everything you need to know about licensing and insurance.',
      content: 'Yes — to legally ride in Indonesia you need a valid motorcycle license from your home country plus an International Driving Permit (IDP) endorsed for motorcycles. We recommend always wearing a helmet and getting travel insurance that covers motorbike riding.',
      image: '/images/blog-3.jpg', tags: 'license,legal,safety'
    },
    {
      title: 'What to Pack for a Multi-Day Bali Ride',
      excerpt: 'Our recommended packing list for a 5-7 day motorbike tour.',
      content: 'Pack light and pack smart. Light clothing for the heat, a waterproof jacket for sudden showers, sturdy shoes, sunscreen, sunglasses, and a small dry bag are essentials. We provide all riding gear including helmet, gloves and jacket.',
      image: '/images/blog-4.jpg', tags: 'packing,tips'
    }
  ];
  const ins = db.prepare('INSERT INTO posts (title, slug, excerpt, content, image, author, tags) VALUES (?,?,?,?,?,?,?)');
  posts.forEach(p => ins.run(p.title, slug(p.title), p.excerpt, p.content, p.image, 'Bali Adventure Team', p.tags));
  console.log('✓ Blog posts seeded');
}

const teamCount = db.prepare('SELECT COUNT(*) c FROM team_members').get().c;
if (teamCount === 0) {
  const team = [
    { name: 'Made Wirawan', position: 'Founder & Lead Guide', bio: 'Born and raised in Ubud, Made has been riding Bali for 20+ years.', image: '/images/team-1.jpg' },
    { name: 'Wayan Putra', position: 'Senior Tour Guide', bio: 'Expert off-road rider and certified mechanic.', image: '/images/team-2.jpg' },
    { name: 'Komang Adi', position: 'Tour Coordinator', bio: 'Handles logistics and customer experience.', image: '/images/team-3.jpg' },
    { name: 'Ketut Sari', position: 'Customer Support', bio: 'Your first point of contact for booking and questions.', image: '/images/team-4.jpg' }
  ];
  const ins = db.prepare('INSERT INTO team_members (name, position, bio, image, sort_order) VALUES (?,?,?,?,?)');
  team.forEach((t, i) => ins.run(t.name, t.position, t.bio, t.image, i));
  console.log('✓ Team seeded');
}

const tCount = db.prepare('SELECT COUNT(*) c FROM testimonials').get().c;
if (tCount === 0) {
  const tests = [
    { name: 'James Carter', country: 'Australia', rating: 5, content: 'Best riding holiday I\'ve ever had. The guides knew every back road and the bikes were spotless.' },
    { name: 'Sophie Müller', country: 'Germany', rating: 5, content: 'Mount Batur sunrise ride was unforgettable. Highly recommended.' },
    { name: 'David Tan', country: 'Singapore', rating: 5, content: 'A 7-day loop that took us through the real Bali — far from the tourist crowds.' },
    { name: 'Emma Wilson', country: 'UK', rating: 5, content: 'Friendly, professional, safety-first. Will be back for another trip.' }
  ];
  const ins = db.prepare('INSERT INTO testimonials (name, country, rating, content) VALUES (?,?,?,?)');
  tests.forEach(t => ins.run(t.name, t.country, t.rating, t.content));
  console.log('✓ Testimonials seeded');
}

const setCount = db.prepare('SELECT COUNT(*) c FROM settings').get().c;
if (setCount === 0) {
  const settings = [
    ['site_name', 'Bali Adventure Moto Tours'],
    ['site_tagline', 'Ride with Local Experts in Bali'],
    ['phone', '+62 812 3456 7890'],
    ['email', 'info@baliadventuremoto.com'],
    ['whatsapp', '+62 812 3456 7890'],
    ['address', 'Jl. Raya Ubud No. 88, Ubud, Bali, Indonesia'],
    ['facebook', 'https://facebook.com/baliadventuremoto'],
    ['instagram', 'https://instagram.com/baliadventuremoto'],
    ['youtube', 'https://youtube.com/@baliadventuremoto'],
    ['hero_title', 'Bali Motorbike Tours'],
    ['hero_subtitle', 'Ride with Local Experts'],
    ['about_short', 'Bali Adventure Moto Tours is a locally-owned motorbike touring company based in Ubud. We craft authentic riding experiences across the island for riders of all levels.']
  ];
  const ins = db.prepare('INSERT INTO settings (key, value) VALUES (?,?)');
  settings.forEach(s => ins.run(s[0], s[1]));
  console.log('✓ Settings seeded');
}

console.log('\n✅ Seed complete.\n');
