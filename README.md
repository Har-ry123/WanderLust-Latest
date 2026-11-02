# WanderLust
live link-https://wanderlust-latest-2.onrender.com/listings
A vacation-rental website where travellers discover stays, read and write reviews, and hosts list their own places.

Built with **Node.js, Express 5, MongoDB (Mongoose) and EJS**.

## Features

- **Listings** – browse, create, edit and delete stays with photos, prices and locations
- **Accounts** – sign up and log in (Passport); only a listing's owner can edit or delete it
- **Reviews** – 1–5 star reviews with comments; average ratings and "Guest favourite" badges
- **Maps** – Mapbox maps when `MAPBOX_TOKEN` is set, free OpenStreetMap maps otherwise
- **Smart search** – type a request like *"beach villa in India under 5k"*; prices, countries, places and kinds of stay are understood
- **AI helpers** (free by default)
  - *Write with AI* – drafts a listing description
  - *Trip planner* – a 3-day plan with local tips for any listing
  - Runs on a local [Ollama](https://ollama.com) model; falls back to built-in rules when no AI is available; optionally uses Claude with `ANTHROPIC_API_KEY`
- **Category tabs**, a *show prices incl. taxes* switch, and a live preview when creating a listing

## Getting started

Requirements: Node.js 20.8 or newer and a MongoDB database (local or [MongoDB Atlas](https://www.mongodb.com/atlas)).

```bash
npm install
cp .env.example .env   # then fill in your values
npm start
```

Open http://localhost:8088.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `ATLASDB_URL` | in production | MongoDB connection string. Defaults to `mongodb://127.0.0.1:27017/WanderLust` |
| `SECRET` or `SECRET_KEY` | in production | Secret used to sign login sessions |
| `MAPBOX_TOKEN` | no | Mapbox public token. Without it, free OpenStreetMap maps are used |
| `OLLAMA_MODEL` / `OLLAMA_URL` | no | Local AI model (default `llama3.2` at `http://127.0.0.1:11434`) |
| `ANTHROPIC_API_KEY` | no | Use Claude for the AI features instead of Ollama (paid) |
| `NODE_ENV` | in production | Set to `production` for secure cookies |
| `PORT` | no | Port to listen on (default `8088`) |

### Free local AI (optional)

1. Install [Ollama](https://ollama.com)
2. `ollama pull llama3.2`
3. Restart the app – the AI writer and trip planner turn on automatically

### Sample data

```bash
npm run seed
```

> **Warning:** this deletes **all** listings in the database set by `ATLASDB_URL` and replaces them with sample data owned by a `demo` user.

## Deploying (e.g. Render)

- **Build command:** `npm install`
- **Start command:** `npm start`
- Set `NODE_ENV=production`, `ATLASDB_URL`, `SECRET_KEY` and optionally `MAPBOX_TOKEN` in the host's environment settings
- In MongoDB Atlas → *Network Access*, allow `0.0.0.0/0` (hosting providers don't have fixed IPs)
- Ollama doesn't run on most hosts, so online the AI features use the built-in rules unless `ANTHROPIC_API_KEY` is set

## Project structure

```
app.js            Express app setup
config/           database, session, passport, mapbox settings
controllers/      route handlers (listings, reviews, users)
routes/           URL routes, including /ai
models/           Mongoose models: Listing, Review, User
middleware/       auth, ownership checks, validation, errors
services/         AI providers (Claude, Ollama) and search rules
utils/            geocoding and helpers
views/            EJS templates
public/           CSS and browser JavaScript
init/             sample data and seeding script
```
