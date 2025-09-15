# 🚀 DongTube API Server - Ready for Vercel

Ini adalah backend API server untuk DongTube yang siap deploy di Vercel (gratis!).

## 📂 File Structure
```
dongtube-api/
├── api/
│   └── index.js          # Main server file
├── package.json          # Dependencies
├── vercel.json          # Vercel configuration
└── README.md            # This file
```

## 🚀 Cara Deploy ke Vercel

### Step 1: Siapkan Files
1. Buat folder baru: `dongtube-api`
2. Copy 3 files ini ke folder:
   - `api/index.js` (server code)
   - `package.json` (dependencies)
   - `vercel.json` (config)

### Step 2: Deploy ke Vercel

**Option A: Via Vercel CLI (Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

# Login ke Vercel
vercel login

# Deploy
cd dongtube-api
vercel

# Follow prompts:
# ? Set up and deploy? → Y
# ? Which scope? → Your Account
# ? Link to existing project? → N
# ? What's your project's name? → dongtube-api
# ? In which directory is your code? → ./
```

**Option B: Via GitHub + Vercel Dashboard**
1. Upload ke GitHub repository
2. Ke https://vercel.com/dashboard
3. Click "New Project"
4. Import dari GitHub
5. Auto deploy!

### Step 3: Get Your API URL
Setelah deploy, Vercel akan memberikan URL seperti:
```
✅ https://dongtube-api-abc123.vercel.app
```

## 🔑 API Endpoints

Base URL: `https://your-project-name.vercel.app`

### Public Endpoints (No API Key)
- `GET /api/health` - Health check
- `GET /api/anime` - Get all anime
- `GET /api/anime/:id` - Get single anime
- `GET /api/search?q=query` - Search anime
- `GET /api/stats` - Get statistics

### Admin Endpoints (Requires API Key: `hanzyy001`)
- `POST /api/anime` - Add new anime
- `PUT /api/anime/:id` - Update anime
- `DELETE /api/anime/:id` - Delete anime
- `POST /api/anime/:id/episodes` - Add episode

### Headers for Admin Endpoints
```javascript
{
  "Content-Type": "application/json",
  "X-API-Key": "hanzyy001"
}
```

## 📱 Test Your API

### Test Health Check
```bash
curl https://your-project-name.vercel.app/api/health
```

### Test Get All Anime
```bash
curl https://your-project-name.vercel.app/api/anime
```

### Test Add Anime (with API key)
```bash
curl -X POST https://your-project-name.vercel.app/api/anime \
  -H "Content-Type: application/json" \
  -H "X-API-Key: hanzyy001" \
  -d '{
    "title": "Test Anime",
    "thumb": "https://example.com/image.jpg",
    "status": "Ongoing",
    "year": 2024,
    "genre": "Action",
    "rating": 8.0,
    "description": "Test anime description"
  }'
```

## 🔧 Update Website Frontend

Setelah API deploy, update file `script.js` di website Anda:

```javascript
// Ganti URL ini dengan URL Vercel Anda
class DataManager {
  constructor() {
    this.apiBaseURL = 'https://dongtube-api-abc123.vercel.app/api'; // ← Ganti ini!
    this.apiKey = 'hanzyy001';
    // ... rest of code
  }
}
```

## 📊 Features

✅ **CRUD Operations** - Add, read, update, delete anime  
✅ **Search & Filter** - Search by title, genre, description  
✅ **Episode Management** - Add episodes to anime  
✅ **Statistics** - Get anime stats and insights  
✅ **API Key Auth** - Secure admin operations  
✅ **CORS Enabled** - Works from any domain  
✅ **Error Handling** - Proper error responses  
✅ **Validation** - Input validation and sanitization  

## 🎯 Default Data

API sudah include 5 anime default:
1. Overlord Movie 3
2. Throne of Seal Movie: Electrolux  
3. Soul Land Movie: Sword Dao Chen Xin
4. Given Movie 2: Hiiragi Mix
5. Shingeki no Kyojin Movie: The Last Attack

## 🔒 Security

- API Key required for write operations
- Input validation and sanitization
- CORS properly configured
- Error messages don't expose sensitive info

## 💡 Tips

1. **Free Tier Limits**: Vercel free tier has limits, tapi cukup untuk personal use
2. **Database**: Data disimpan di memory, akan reset setiap deploy. Untuk production, bisa pakai database external
3. **Domain Custom**: Bisa set custom domain di Vercel dashboard
4. **Monitoring**: Check logs di Vercel dashboard
5. **Updates**: Push ke GitHub auto deploy (jika connect ke GitHub)

## 🆘 Troubleshooting

**Q: Error "API Key missing"**  
A: Pastikan header `X-API-Key: hanzyy001` ada di request POST/PUT/DELETE

**Q: CORS Error**  
A: API sudah support CORS untuk semua domain

**Q: 404 Not Found**  
A: Pastikan URL endpoint benar, cek `/api/health` dulu

**Q: Data hilang setelah deploy**  
A: Normal, karena pakai in-memory storage. Data akan reset tiap deploy.

## 🎉 Selamat!

API server Anda siap digunakan! Sekarang website DongTube bisa add/edit/delete anime langsung ke server production.

---
**API Key**: `hanzyy001`  
**Support**: Check Vercel dashboard untuk logs dan monitoring
