const fetch = require('node-fetch');

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

const getAnilistSearchQuery = `
  query ($search: String) {
    Page(page: 1, perPage: 10) {
      media(search: $search, type: ANIME) {
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

// API Handler
module.exports = async (req, res) => {
  const { type, id, query: searchQuery } = req.query;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    let query;
    let variables = {};

    switch (type) {
      case 'info': {
        if (!id || isNaN(id)) {
          return res.status(400).json({ error: "Valid Anime ID is required in the URL" });
        }
        query = getAnilistAnimeQuery;
        variables = { id: parseInt(id) };
        break;
      }

      case 'trending': {
        query = getAnilistTrendingQuery;
        break;
      }

      case 'search': {
        if (!searchQuery) {
          return res.status(400).json({ error: "Search query is required in the URL" });
        }
        query = getAnilistSearchQuery;
        variables = { search: searchQuery };
        break;
      }

      default:
        return res.status(400).json({ error: "Invalid endpoint type" });
    }

    const data = await fetchAnilistData(query, variables);

    if (type === 'info') {
      const anime = data.data.Media;
      anime.recommendations = anime.recommendations.edges.map(edge => edge.node.mediaRecommendation);
      return res.status(200).json({ results: anime });
    } else if (type === 'trending') {
      return res.status(200).json({ results: data.data.Page.media });
    } else if (type === 'search') {
      return res.status(200).json({ results: data.data.Page.media });
    }

    res.status(200).json({ results: data });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
