const express = require('express');
const axios = require('axios');
const Fuse = require('fuse.js');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection setup
const mongoURI = 'mongodb+srv://hipanime-search:8yXkgro37GtGQcie@dbfuzzysearchhipanime.qa3er.mongodb.net/?retryWrites=true&w=majority&appName=DbFuzzySearchHipanime';
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.log('MongoDB connection error:', err));

// Define Anime Schema
const animeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  synopsis: String,
  episodes: Number,
  score: Number,
  genres: [String],
  aired: String,
  type: String, // TV, Movie, OVA, etc.
  mal_id: { type: Number, unique: true },
  jikan_id: { type: Number, unique: true },
});

// Create Anime model
const Anime = mongoose.model('Anime', animeSchema);

// Fetch Anime Data from Jikan API and MAL API
async function fetchAnimeData() {
  try {
    // Jikan API: Top Anime
    const topAnimeJikan = await axios.get('https://api.jikan.moe/v4/top/anime');
    const topAnimeDataJikan = topAnimeJikan.data.data;

    // MAL API: Top Anime (using official MAL API or Jikan as an alternative)
    const topAnimeMAL = await axios.get('https://api.myanimelist.net/v2/anime/ranking', {
      headers: {
        'X-MAL-CLIENT-ID': '260059a888a69c48056f6eec62df6408',
      },
    });
    const topAnimeDataMAL = topAnimeMAL.data.data;

    // Combine Data from both APIs (Jikan and MAL)
    const combinedAnimeData = [...topAnimeDataJikan, ...topAnimeDataMAL];

    // Save or update the anime data in the database
    for (let anime of combinedAnimeData) {
      const animeDetails = {
        title: anime.title,
        synopsis: anime.synopsis,
        episodes: anime.episodes || 0,
        score: anime.score || 0,
        genres: anime.genres ? anime.genres.map(g => g.name) : [],
        aired: anime.aired ? anime.aired.string : '',
        type: anime.type,
        mal_id: anime.mal_id || null,
        jikan_id: anime.jikan_id || null,
      };

      // Check if anime already exists, update if exists, else create new
      const existingAnime = await Anime.findOne({ mal_id: anime.mal_id });
      if (existingAnime) {
        await Anime.updateOne({ mal_id: anime.mal_id }, animeDetails);
      } else {
        const newAnime = new Anime(animeDetails);
        await newAnime.save();
      }
    }
    console.log('Anime data fetched and saved/updated in the database');
  } catch (error) {
    console.error('Error fetching anime data:', error);
  }
}

// Start fetching data initially
fetchAnimeData();

// Routes for different anime metadata
app.get('/meta/top', async (req, res) => {
  try {
    const animeData = await Anime.find().sort({ score: -1 }).limit(10); // Fetch top 10 based on score
    res.json(animeData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/meta/popular', async (req, res) => {
  try {
    const animeData = await Anime.find().sort({ score: -1 }).limit(10); // Fetch popular anime
    res.json(animeData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/meta/new-season', async (req, res) => {
  try {
    const animeData = await Anime.find().sort({ aired: -1 }).limit(10); // Fetch anime sorted by recent aired season
    res.json(animeData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/meta/genre/:genre', async (req, res) => {
  const genre = req.params.genre;
  try {
    const animeData = await Anime.find({ genres: genre });
    res.json(animeData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/meta/subbed', async (req, res) => {
  try {
    const animeData = await Anime.find({ type: 'Subbed' }); // Filter by type if available
    res.json(animeData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/meta/dubbed', async (req, res) => {
  try {
    const animeData = await Anime.find({ type: 'Dubbed' }); // Filter by type if available
    res.json(animeData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/meta/ovas', async (req, res) => {
  try {
    const animeData = await Anime.find({ type: 'OVA' }); // Filter by OVA type
    res.json(animeData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/meta/tv-series', async (req, res) => {
  try {
    const animeData = await Anime.find({ type: 'TV' }); // Filter by TV type
    res.json(animeData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/meta/movies', async (req, res) => {
  try {
    const animeData = await Anime.find({ type: 'Movie' }); // Filter by Movie type
    res.json(animeData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/meta/special', async (req, res) => {
  try {
    const animeData = await Anime.find({ type: 'Special' }); // Filter by Special type
    res.json(animeData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fuzzy Search Route
app.get('/search', async (req, res) => {
  const query = req.query.q;
  try {
    // Fetch all anime from the database
    const allAnime = await Anime.find();
    // Fuzzy Search using Fuse.js
    const fuse = new Fuse(allAnime, {
      keys: ['title'],
      threshold: 0.4,
    });
    const results = fuse.search(query).map(result => result.item);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for searching anime by year
app.get('/meta/year/:year', async (req, res) => {
  const year = req.params.year;
  try {
    const animeData = await Anime.find({ aired: { $regex: year } });
    res.json(animeData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for searching anime by score
app.get('/meta/score/:score', async (req, res) => {
  const score = req.params.score;
  try {
    const animeData = await Anime.find({ score: { $gte: score } });
    res.json(animeData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
