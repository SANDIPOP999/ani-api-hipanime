import express from 'express';
import fetch from 'node-fetch';
import serverless from 'serverless-http';

const app = express();

// Helper function to fetch AniList API data
async function fetchAnilistData(query, variables = {}) {
  const url = 'https://graphql.anilist.co';
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  };

  const res = await fetch(url, options);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(`AniList API Error: ${error.errors[0]?.message || 'Unknown error'}`);
  }
  return res.json();
}

// GraphQL Queries
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

// Routes
app.use(express.json()); // Parse JSON requests

// Route: Anime Info
app.post('/meta/anilist/info/:id', async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'Valid Anime ID is required' });
  }

  try {
    const variables = { id: parseInt(id, 10) };
    const data = await fetchAnilistData(getAnilistAnimeQuery, variables);

    const anime = data.data.Media;
    anime.recommendations = anime.recommendations.edges.map((edge) => edge.node.mediaRecommendation);

    res.status(200).json({ results: anime });
  } catch (error) {
    console.error('Error fetching anime info:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route: Trending Anime
app.post('/meta/anilist/trending', async (req, res) => {
  try {
    const data = await fetchAnilistData(getAnilistTrendingQuery);
    res.status(200).json({ results: data.data.Page.media });
  } catch (error) {
    console.error('Error fetching trending anime:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Export the Express app wrapped in serverless-http
export default serverless(app);
