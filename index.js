// ========================================
//   DONGTUBE API SERVER FOR VERCEL
// ========================================

const express = require('express');
const cors = require('cors');
const multer = require('multer');

const app = express();
const API_KEY = 'hanzyy001';

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-API-Key']
}));
app.use(express.json());

// In-memory database (untuk Vercel serverless)
let animeDatabase = [
  {
    id: 1,
    title: "Overlord Movie 3",
    thumb: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS9fDI0GaD5RkNRVZDDE86wEfL68tMB2u_zFwAPiRnWxv7yxoxObWNFsTd-&s=10",
    status: "Ongoing",
    year: 2024,
    genre: "Action, Fantasy",
    rating: 8.5,
    description: "The epic conclusion of the Overlord movie trilogy featuring Ainz Ooal Gown's ultimate conquest.",
    episodes: [
      { num: 1, src: "https://short.icu/4lZNVHkOJ", title: "The Final Battle Begins" },
      { num: 2, src: "https://www.w3schools.com/html/movie.mp4", title: "Supreme Overlord's Power" }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    title: "Throne of Seal Movie: Electrolux Sub Indo",
    thumb: "https://static.wikia.nocookie.net/7374f95d-7da1-414e-8dd0-da3fbd832506/scale-to-width/755",
    status: "Complete",
    year: 2023,
    genre: "Adventure, Magic",
    rating: 7.8,
    description: "Follow the legendary journey of knights and their divine seals in this epic adventure.",
    episodes: [
      { num: 1, src: "https://ok.ru/videoembed/9975931079346", title: "The Electrolux Awakening" }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 3,
    title: "Given Movie 2: Hiiragi Mix Sub Indo",
    thumb: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTijX0z-blBVBh_kikCsQWp1xXRFozuIsfjtkwYhbaNmg&s=10",
    status: "Complete",
    year: 2024,
    genre: "Romance, Music",
    rating: 8.9,
    description: "A heartwarming continuation of the Given series focusing on music and relationships.",
    episodes: [
      { num: 1, src: "https://short.icu/7frPHvDiW", title: "Hiiragi's Melody" }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 4,
    title: "Shingeki no Kyojin Movie: Kanketsu-hen – The Last Attack Sub Indo",
    thumb: "https://titipjepang.com/wp-content/uploads/2024/11/BLOG-Attack-on-Titan-The-Last-Attack-scaled.jpg",
    status: "Complete",
    year: 2024,
    genre: "Action, Drama",
    rating: 9.2,
    description: "The final chapter of humanity's fight against the titans in this epic conclusion.",
    episodes: [
      { num: 1, src: "https://short.icu/dh6SQbM-9", title: "The Last Attack" }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// API Key middleware
const validateApiKey = (req, res, next) => {
  // Allow GET requests without API key
  if (req.method === 'GET') {
    return next();
  }
  
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid or missing API key' 
    });
  }
  next();
};

// Helper functions
const generateId = () => {
  return Math.max(...animeDatabase.map(a => a.id), 0) + 1;
};

const findAnimeById = (id) => {
  return animeDatabase.find(a => a.id === parseInt(id));
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true,
    message: 'DongTube API is running!',
    timestamp: new Date().toISOString(),
    animeCount: animeDatabase.length,
    endpoints: [
      'GET /api/anime - Get all anime',
      'GET /api/anime/:id - Get single anime',
      'POST /api/anime - Add new anime (requires API key)',
      'PUT /api/anime/:id - Update anime (requires API key)',
      'DELETE /api/anime/:id - Delete anime (requires API key)',
      'GET /api/search?q=query - Search anime'
    ]
  });
});

// Get all anime
app.get('/api/anime', (req, res) => {
  try {
    const { status, limit, offset, sort } = req.query;
    
    let result = [...animeDatabase];
    
    // Filter by status
    if (status && status !== 'all') {
      result = result.filter(anime => 
        anime.status.toLowerCase() === status.toLowerCase()
      );
    }
    
    // Sort
    if (sort) {
      switch (sort) {
        case 'title':
          result.sort((a, b) => a.title.localeCompare(b.title));
          break;
        case 'year':
          result.sort((a, b) => (b.year || 0) - (a.year || 0));
          break;
        case 'rating':
          result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
          break;
        case 'updated':
          result.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
          break;
      }
    }
    
    const totalCount = result.length;
    
    // Pagination
    if (limit) {
      const limitNum = parseInt(limit) || 10;
      const offsetNum = parseInt(offset) || 0;
      result = result.slice(offsetNum, offsetNum + limitNum);
    }
    
    res.json({
      success: true,
      data: result,
      pagination: {
        total: totalCount,
        limit: parseInt(limit) || totalCount,
        offset: parseInt(offset) || 0,
        hasMore: totalCount > (parseInt(offset) || 0) + (parseInt(limit) || totalCount)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch anime list' 
    });
  }
});

// Get single anime
app.get('/api/anime/:id', (req, res) => {
  try {
    const anime = findAnimeById(req.params.id);
    
    if (!anime) {
      return res.status(404).json({ 
        success: false, 
        error: 'Anime not found' 
      });
    }
    
    res.json({ 
      success: true, 
      data: anime 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch anime' 
    });
  }
});

// Add new anime
app.post('/api/anime', validateApiKey, (req, res) => {
  try {
    const { title, thumb, status, year, genre, rating, description, episodes } = req.body;
    
    // Validation
    if (!title?.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title is required' 
      });
    }
    
    if (!thumb?.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Thumbnail URL is required' 
      });
    }
    
    if (!status || !['Ongoing', 'Complete'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Status must be either "Ongoing" or "Complete"' 
      });
    }
    
    // Check if anime already exists
    const existingAnime = animeDatabase.find(a => 
      a.title.toLowerCase() === title.toLowerCase()
    );
    
    if (existingAnime) {
      return res.status(409).json({
        success: false,
        error: 'Anime with this title already exists'
      });
    }
    
    const newAnime = {
      id: generateId(),
      title: title.trim(),
      thumb: thumb.trim(),
      status,
      year: parseInt(year) || new Date().getFullYear(),
      genre: genre?.trim() || 'Unknown',
      rating: parseFloat(rating) || 7.0,
      description: description?.trim() || '',
      episodes: Array.isArray(episodes) ? episodes : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    animeDatabase.push(newAnime);
    
    res.status(201).json({ 
      success: true, 
      data: newAnime,
      message: 'Anime added successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create anime' 
    });
  }
});

// Update anime
app.put('/api/anime/:id', validateApiKey, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const animeIndex = animeDatabase.findIndex(a => a.id === id);
    
    if (animeIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        error: 'Anime not found' 
      });
    }
    
    const currentAnime = animeDatabase[animeIndex];
    const updateData = { ...req.body };
    
    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.createdAt;
    
    // Validate status if provided
    if (updateData.status && !['Ongoing', 'Complete'].includes(updateData.status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Status must be either "Ongoing" or "Complete"' 
      });
    }
    
    // Parse numeric fields
    if (updateData.year) {
      updateData.year = parseInt(updateData.year);
    }
    if (updateData.rating) {
      updateData.rating = parseFloat(updateData.rating);
    }
    
    const updatedAnime = {
      ...currentAnime,
      ...updateData,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };
    
    animeDatabase[animeIndex] = updatedAnime;
    
    res.json({ 
      success: true, 
      data: updatedAnime,
      message: 'Anime updated successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update anime' 
    });
  }
});

// Delete anime
app.delete('/api/anime/:id', validateApiKey, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const animeIndex = animeDatabase.findIndex(a => a.id === id);
    
    if (animeIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        error: 'Anime not found' 
      });
    }
    
    const deletedAnime = animeDatabase.splice(animeIndex, 1)[0];
    
    res.json({ 
      success: true, 
      data: deletedAnime,
      message: 'Anime deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete anime' 
    });
  }
});

// Search anime
app.get('/api/search', (req, res) => {
  try {
    const { q, status, genre, year, limit } = req.query;
    
    if (!q?.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Search query (q) is required' 
      });
    }
    
    const searchTerm = q.toLowerCase().trim();
    
    let results = animeDatabase.filter(anime => {
      const matchesQuery = 
        anime.title.toLowerCase().includes(searchTerm) ||
        anime.description?.toLowerCase().includes(searchTerm) ||
        anime.genre?.toLowerCase().includes(searchTerm);
      
      const matchesStatus = !status || status === 'all' || 
        anime.status.toLowerCase() === status.toLowerCase();
      
      const matchesGenre = !genre || 
        anime.genre?.toLowerCase().includes(genre.toLowerCase());
      
      const matchesYear = !year || 
        anime.year === parseInt(year);
      
      return matchesQuery && matchesStatus && matchesGenre && matchesYear;
    });
    
    // Sort by relevance (title matches first)
    results.sort((a, b) => {
      const aTitle = a.title.toLowerCase().includes(searchTerm);
      const bTitle = b.title.toLowerCase().includes(searchTerm);
      
      if (aTitle && !bTitle) return -1;
      if (!aTitle && bTitle) return 1;
      return 0;
    });
    
    // Limit results
    if (limit && parseInt(limit) > 0) {
      results = results.slice(0, parseInt(limit));
    }
    
    res.json({
      success: true,
      data: results,
      query: {
        q: searchTerm,
        status,
        genre,
        year,
        limit: parseInt(limit) || results.length
      },
      totalResults: results.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Search failed' 
    });
  }
});

// Add episode to anime
app.post('/api/anime/:id/episodes', validateApiKey, (req, res) => {
  try {
    const anime = findAnimeById(req.params.id);
    
    if (!anime) {
      return res.status(404).json({ 
        success: false, 
        error: 'Anime not found' 
      });
    }
    
    const { num, src, title } = req.body;
    
    if (!num || !src?.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Episode number and source URL are required' 
      });
    }
    
    // Check if episode already exists
    const existingEpisode = anime.episodes.find(ep => ep.num === parseInt(num));
    if (existingEpisode) {
      return res.status(409).json({
        success: false,
        error: 'Episode with this number already exists'
      });
    }
    
    const newEpisode = {
      num: parseInt(num),
      src: src.trim(),
      title: title?.trim() || `Episode ${num}`
    };
    
    anime.episodes.push(newEpisode);
    anime.episodes.sort((a, b) => a.num - b.num); // Sort by episode number
    anime.updatedAt = new Date().toISOString();
    
    res.status(201).json({ 
      success: true, 
      data: newEpisode,
      message: 'Episode added successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to add episode' 
    });
  }
});

// Get statistics
app.get('/api/stats', (req, res) => {
  try {
    const now = new Date();
    const thisYear = now.getFullYear();
    
    const stats = {
      totalAnime: animeDatabase.length,
      totalEpisodes: animeDatabase.reduce((sum, anime) => sum + anime.episodes.length, 0),
      ongoingAnime: animeDatabase.filter(a => a.status === 'Ongoing').length,
      completeAnime: animeDatabase.filter(a => a.status === 'Complete').length,
      thisYearAnime: animeDatabase.filter(a => a.year === thisYear).length,
      averageRating: (animeDatabase.reduce((sum, a) => sum + (a.rating || 0), 0) / animeDatabase.length).toFixed(1),
      topGenres: getTopGenres(),
      recentlyUpdated: animeDatabase
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 5)
        .map(a => ({ id: a.id, title: a.title, updatedAt: a.updatedAt })),
      lastUpdated: new Date().toISOString()
    };
    
    res.json({ 
      success: true, 
      data: stats 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get statistics' 
    });
  }
});

// Helper function for top genres
function getTopGenres() {
  const genreCount = {};
  
  animeDatabase.forEach(anime => {
    if (anime.genre) {
      const genres = anime.genre.split(',').map(g => g.trim());
      genres.forEach(genre => {
        genreCount[genre] = (genreCount[genre] || 0) + 1;
      });
    }
  });
  
  return Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([genre, count]) => ({ genre, count }));
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: `Endpoint ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: [
      'GET /api/health',
      'GET /api/anime',
      'GET /api/anime/:id',
      'POST /api/anime (requires API key)',
      'PUT /api/anime/:id (requires API key)',
      'DELETE /api/anime/:id (requires API key)',
      'GET /api/search?q=query',
      'GET /api/stats'
    ]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('API Error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// Export for Vercel
module.exports = app;