import express from 'express';
import fetch from 'node-fetch';

// Initialize Express.js app
const app = express();

// Helper function to fetch data from AniList API
async function fetchAnilistData(query, variables = {}) {
  const url = "https://graphql.anilist.co";
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  };

  const res = await fetch(url, options);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(`AniList API Error: ${error.errors[0]?.message || "Unknown error"}`);
  }
  return res.json();
}

// GraphQL Query for Anime Info
const getAnilistAnimeQuery = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title {
        romaji
        english
        native
      }
      type
      format
      status
      episodes
      season
      seasonYear
      startDate {
        year
        month
        day
      }
      endDate {
        year
        month
        day
      }
      genres
      description
      duration
      averageScore
      isAdult
      recommendations {
        edges {
          node {
            mediaRecommendation {
              id
              title {
                romaji
                english
              }
              coverImage {
                large
              }
            }
          }
        }
      }
      streamingEpisodes {
        title
        thumbnail
        url
      }
      coverImage {
        extraLarge
        large
        medium
      }
    }
  }
`;

// GraphQL Query for Trending Anime
const getAnilistTrendingQuery = `
  query {
    Page {
      media(type: ANIME, sort: TRENDING_DESC) {
        id
        title {
          romaji
          english
        }
        coverImage {
          large
        }
      }
    }
  }
`;

// Express.js routes
app.use(express.json());  // For parsing application/json

// Route for fetching anime info
app.post('/api/meta/anilist/info/:id', async (req, res) => {
  const { id } = req.params;  // Extract ID from the URL

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Valid Anime ID is required in the URL" });
  }

  try {
    const variables = { id: parseInt(id) };
    const data = await fetchAnilistData(getAnilistAnimeQuery, variables);

    const anime = data.data.Media;
    anime.recommendations = anime.recommendations.edges.map(edge => edge.node.mediaRecommendation);

    res.status(200).json({ results: anime });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route for fetching trending anime
app.post('/api/meta/anilist/trending', async (req, res) => {
  try {
    const data = await fetchAnilistData(getAnilistTrendingQuery);

    res.status(200).json({ results: data.data.Page.media });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Export Express.js app to Vercel's serverless handler
export default app;
