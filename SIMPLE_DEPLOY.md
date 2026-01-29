# Deploy Uni in 5 Minutes - SUPER SIMPLE

## Option 1: Railway (Easiest - Actually Free)

### Step 1: Download & Extract
- Download the `uni-real-ai.tar.gz` file
- Extract it (double-click or right-click → Extract)
- You'll get a folder called `uni-real-ai`

### Step 2: Put on GitHub
```bash
# Open terminal/command prompt in the uni-real-ai folder

# First time setup
git init
git add .
git commit -m "uni ai"

# Create repo on github.com (click the + icon, "New repository")
# Name it "uni" or whatever
# Copy the commands they give you, something like:

git remote add origin https://github.com/YOUR-USERNAME/uni.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy on Railway
1. Go to https://railway.app
2. Sign up (free, use GitHub login)
3. Click "New Project"
4. Click "Deploy from GitHub repo"
5. Select your `uni` repository
6. Click "Deploy"

### Step 4: Get Your URL
- Railway automatically builds and deploys
- After ~2 minutes, click "Generate Domain"
- You get a URL like `uni-production.up.railway.app`
- **DONE!** Uni is live and learning

---

## Option 2: Render (Also Free)

### Step 1-2: Same as above (download, extract, push to GitHub)

### Step 3: Deploy on Render
1. Go to https://render.com
2. Sign up (free, use GitHub)
3. Click "New +" → "Web Service"
4. Click "Connect account" for GitHub
5. Find your `uni` repo, click "Connect"
6. Fill in:
   - Name: `uni`
   - Build Command: `npm install`
   - Start Command: `npm start`
7. Click "Create Web Service"

### Step 4: Get Your URL
- Render builds automatically (~3 minutes)
- You get URL like `https://uni.onrender.com`
- **DONE!**

**Note**: Free tier sleeps after 15 min idle. Wakes up in 30 seconds when someone visits.

---

## Option 3: Test Locally First (Recommended)

### Step 1: Install Node.js
- Go to https://nodejs.org
- Download the LTS version (left button)
- Install it (just keep clicking Next)

### Step 2: Run Uni
```bash
# Extract the uni-real-ai.tar.gz file
# Open terminal/command prompt in that folder

npm install
npm start
```

### Step 3: Open Browser
- Go to `http://localhost:3000`
- Talk to Uni
- Watch it learn
- Check the Knowledge Graph panel

### To Stop:
- Press `Ctrl+C` in the terminal

---

## What You'll See

When you open Uni in browser:

1. **Stats Bar** - Shows knowledge growing in real-time
2. **Conversation Panel** - Talk to Uni here
3. **Knowledge Graph** - See what it's learning
4. **Direct Teaching** - Teach it facts directly

---

## How to Test It's Actually Learning

### Test 1: Teach Something
```
In the conversation:
You: "teach you about gravity: it's the force that attracts objects with mass"

Look at Knowledge Graph panel → "gravity" appears with your definition
```

### Test 2: Ask It Back
```
You: "what do you know about gravity?"

Uni: "Based on what I've learned, gravity [your exact definition]. 
I've encountered this concept 1 times."
```

### Test 3: Build Associations
```
You: "physics and gravity are related"
You: "Newton studied gravity"

Then ask: "what's associated with gravity?"
Uni will tell you about physics and Newton with association strengths
```

### Test 4: Watch Stats
After each conversation:
- Knowledge Base number goes up
- Learning Events increases
- Vocabulary Size grows
- Associations count increases

---

## Troubleshooting

### "npm not found"
- Install Node.js from nodejs.org

### "Port 3000 already in use"
```bash
# Find what's using it
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Kill it or change Uni's port:
PORT=3001 npm start
```

### Can't connect to deployed version
- Wait 2-3 minutes after deploying
- Check Railway/Render dashboard for errors
- Make sure you pushed all files to GitHub

### Learning not persisting on Railway/Render
- That's normal on free tiers (they restart periodically)
- Upgrade to paid tier ($5/month) for persistent storage
- Or use a database (more complex setup)

---

## Next Steps After Deployment

1. **Share the URL** - Send to friends
2. **Teach it stuff** - Build up its knowledge
3. **Monitor learning** - Watch the stats grow
4. **Export knowledge** - Download `uni_brain.json` from server

---

## Summary

**Fastest path:**
1. Extract files
2. Push to GitHub (5 commands)
3. Deploy on Railway (3 clicks)
4. Get URL and start using

**Total time: 5-10 minutes**

No Docker, no complex config, no database setup needed.
