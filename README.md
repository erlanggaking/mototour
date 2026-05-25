# Bali Adventure Moto Tours

A full-stack motorbike tour website inspired by frontiertravelvietnam.com, rebranded as **Bali Adventure Moto Tours** with a blue + orange theme.

## Stack
- Node.js + Express
- EJS templates
- SQLite (better-sqlite3)
- Session-based admin auth (bcrypt)
- Multer for image uploads

## Run

```bash
npm install
npm run seed     # only needed first time
npm start        # or: npm run dev
```

Open http://localhost:3000

## Admin

URL: http://localhost:3000/admin/login
- Username: `admin`
- Password: `admin123`

Change the password in **Admin → Admin Users** after first login.

## Features

### Public site
- Home with hero, featured tours, categories, bikes, testimonials, blog
- Motorbike Tours listing + by category
- Tour detail with itinerary tabs, inclusions/exclusions, FAQ, booking form
- Big Bike Tours
- Join a Group (group tours)
- Our Bikes catalog + bike detail
- Travel Guides (blog) + post detail
- About Us, Our Team, Contact
- Booking form (with optional tour selection)
- Search

### Admin panel
- Dashboard with stats and recent activity
- Tour categories CRUD
- Tours CRUD (with itinerary builder, image upload, inclusions/exclusions)
- Bikes CRUD
- Travel Guides (blog) CRUD
- Team members CRUD
- Testimonials CRUD
- Bookings management (status, reply, delete)
- Contact messages
- Site settings (brand, contact, social)
- Admin users (create, change password, delete)
