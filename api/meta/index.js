require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const Fuse = require('fuse.js');

const app = express();
const PORT = process.env.PORT || 3000;
const MAL_CLIENT_ID = process.env.MAL_CLIENT_ID;
const MONGO_URI = process.env.MONGODB_URI;

// ✅ Connect to MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB Connected')).catch(err => console.error('❌ MongoDB Connection Error:', err));

// ✅ Define Anime Schema
const animeSchema = new mongoose.Schema({
  mal_id: Number,
  title: String,
  synopsis: String,
  episodes: Number,
  status: String,
  genres: [String],
  banner: String,
  cover: String,
  season: String,
  year: Number,
  score: Number,
  themes: [String],
  characters: [String],
  trailer: String,
  createdAt: { type: Date, default: Date.now }
});

const Anime = mongoose.model('Anime', animeSchema);

// ✅ Fetch Anime from MAL API
const fetchAnimeFromMAL = async (query) => {
  try {
    const response = await axios.get(`https://api.myanimelist.net/v2/anime?q=${query}&limit=10&fields=id,title,synopsis,episodes,status,genres,main_picture,start_season,mean,related_anime,background,studios,theme,pictures,media_type`, {
      headers: { 'X-MAL-CLIENT-ID': MAL_CLIENT_ID }
    });

    return response.data.data.map(anime => ({
      mal_id: anime.node.id,
      title: anime.node.title,
      synopsis: anime.node.synopsis || 'No synopsis available.',
      episodes: anime.node.episodes || 'Unknown',
      status: anime.node.status || 'Unknown',
      genres: anime.node.genres?.map(g => g.name) || [],
      banner: anime.node.main_picture?.large || '',
      cover: anime.node.main_picture?.medium || '',
      season: anime.node.start_season?.season || 'Unknown',
      year: anime.node.start_season?.year || 'Unknown',
      score: anime.node.mean || 'N/A',
      themes: anime.node.theme || [],
      characters: anime.node.characters || [],
      trailer: anime.node.trailer || '',
    }));
  } catch (error) {
    console.error('❌ Error Fetching MAL API:', error.message);
    return [];
  }
};

// ✅ Store Anime in MongoDB
const storeAnimeInDB = async (animeList) => {
  try {
    for (const anime of animeList) {
      await Anime.findOneAndUpdate({ mal_id: anime.mal_id }, anime, { upsert: true, new: true });
    }
    console.log('✅ Anime data updated in MongoDB');
  } catch (error) {
    console.error('❌ Error Storing in MongoDB:', error.message);
  }
};

// ✅ Fetch & Store Anime in DB every 24 Hours
const updateAnimeDatabase = async () => {
  const trendingAnime = await fetchAnimeFromMAL('trending');
  if (trendingAnime.length > 0) {
    await storeAnimeInDB(trendingAnime);
  }
};

setInterval(updateAnimeDatabase, 24 * 60 * 60 * 1000); // Every 24 hours
updateAnimeDatabase();

// ✅ Implement Fuzzy Search
let fuse;
const initializeFuzzySearch = async () => {
  const allAnime = await Anime.find();
  fuse = new Fuse(allAnime, {
    keys: ['title', 'synopsis', 'genres'],
    threshold: 0.3
  });
  console.log('✅ Fuzzy Search Initialized');
};

initializeFuzzySearch();

// ✅ API Routes
app.get('/meta/search', async (req, res) => {
  const query = req.query.query;
  if (!query) return res.status(400).json({ error: 'Missing query parameter' });

  const results = fuse.search(query).map(result => result.item).slice(0, 10);
  res.json(results);
});

app.get('/meta/info', async (req, res) => {
  const mal_id = req.query.id;
  if (!mal_id) return res.status(400).json({ error: 'Missing id parameter' });

  const anime = await Anime.findOne({ mal_id });
  if (!anime) return res.status(404).json({ error: 'Anime not found' });

  res.json(anime);
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
