# Bali Adventure Moto Tours

A full-stack motorbike tour website inspired by frontiertravelvietnam.com, rebranded as **Bali Adventure Moto Tours** with a blue + orange theme.

## Stack
- Node.js + Express
- EJS templates
- SQLite (better-sqlite3)
- Session-based admin auth (bcrypt)
- Multer for image uploads

## Run locally

```bash
npm install
npm run seed     # only needed first time (also runs automatically on first start)
npm start        # or: npm run dev
```

Open http://localhost:3000

## Admin

URL: http://localhost:3000/admin/login
- Username: `admin`
- Password: `admin123`

Change the password right after first login (Admin → Admin Users).

## Deploy to Render.com

This repo includes a `render.yaml` blueprint, so deploy is one click.

1. Push this repo to GitHub (already done at https://github.com/erlanggaking/mototour).
2. Sign in to https://render.com → **New +** → **Blueprint**.
3. Pick the `mototour` repo. Render reads `render.yaml` and creates:
   - A web service (`bali-adventure-moto`) on the free plan, Singapore region
   - A 1 GB persistent disk mounted at `/var/data` for the SQLite DB and uploads
   - A randomly-generated `SESSION_SECRET`
4. Click **Apply**. First build takes 2–3 minutes. Database is auto-seeded on first start.
5. When live, go to `https://<your-app>.onrender.com/admin/login` and log in with `admin` / `admin123`. **Change the password immediately.**

### Free plan note
Render free web services sleep after 15 minutes of no traffic. First request after a sleep takes ~30 seconds to wake up. Upgrade to the **Starter plan** ($7/mo) for always-on.

### Manual deploy (without blueprint)
If you prefer to wire it up by hand:
- Service type: **Web Service**, Runtime: **Node**
- Build command: `npm install`
- Start command: `npm start`
- Add a 1 GB **Disk** mounted at `/var/data`
- Env vars:
  - `NODE_ENV=production`
  - `DATA_DIR=/var/data`
  - `UPLOAD_DIR=/var/data/uploads`
  - `SESSION_SECRET=<some long random string>`

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

## Environment variables

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | (unset) | Set to `production` to enable secure cookies |
| `DATA_DIR` | `./data` | Folder for SQLite database |
| `UPLOAD_DIR` | `./public/uploads` | Folder for uploaded images |
| `SESSION_SECRET` | (insecure default) | **Set a long random string in production** |
