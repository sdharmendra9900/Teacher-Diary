# Teacher Diary Server (Express + SQLite)

## Overview
Simple Express API with SQLite storage for the Teacher Daily Diary app. Supports user registration/login (JWT), profiles, diary entries, and admin export.

## Setup (local)
1. Install Node.js (>=18 recommended).
2. In the `server/` folder run:
   ```bash
   npm install
   node migrate.js
   npm start
   ```
3. Server listens on port `7842` by default.

## Deploy to Render (free)
1. Create a GitHub repo and push this project.
2. Create a new Web Service on Render, connect your repo, and set:
   - Build Command: `npm install`
   - Start Command: `npm start`
3. Render will provision and run your server. Set environment variable `JWT_SECRET` in Render dashboard to a strong secret.

## Notes
- Database file `database.sqlite` will be created automatically. On Render, persistent disk is available for web services.
- For production, use HTTPS, strong JWT secret, and proper backups of `database.sqlite`.
