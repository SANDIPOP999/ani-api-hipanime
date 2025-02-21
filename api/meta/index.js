const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

const MAL_API_BASE = "https://api.myanimelist.net/v2";
const CLIENT_ID = "260059a888a69c48056f6eec62df6408";  // Store in .env

// Function to fetch data from MAL API
const fetchMALData = async (endpoint, params = {}) => {
  try {
    const response = await axios.get(`${MAL_API_BASE}${endpoint}`, {
      headers: { "X-MAL-CLIENT-ID": CLIENT_ID },
      params,
    });
    return response.data;
  } catch (error) {
    console.error("MAL API Error:", error.response?.data || error.message);
    return null;
  }
};

// 📌 API Endpoints
app.get("/api/meta/index", async (req, res) => {
  const { type, q, id } = req.query;

  let data;
  switch (type) {
    case "banner":
      data = await fetchMALData("/anime/ranking", { ranking_type: "all" });
      break;
    case "top_airing":
      data = await fetchMALData("/anime/ranking", { ranking_type: "airing" });
      break;
    case "upcoming":
      data = await fetchMALData("/anime/ranking", { ranking_type: "upcoming" });
      break;
    case "search":
      data = await fetchMALData("/anime", { q });
      break;
    case "info":
      if (!id) return res.status(400).json({ error: "Anime ID required" });
      data = await fetchMALData(`/anime/${id}`);
      break;
    default:
      return res.status(400).json({ error: "Invalid type" });
  }

  if (!data) return res.status(500).json({ error: "Failed to fetch data" });
  res.json(data);
});

// Start Server
module.exports = app;
