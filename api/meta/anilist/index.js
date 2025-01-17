const fetch = require('node-fetch');

// Helper function to fetch data from AniList API
async function fetchAnilistData(query) {
  const url = "https://graphql.anilist.co";
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query })
  };

  const res = await fetch(url, options);
  const data = await res.json();
  return data;
}

// Define different queries based on endpoint type
const getAnilistTrendingQuery = () => `
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

const getAnilistUpcomingQuery = () => `
  query {
    Page {
      airingSchedules {
        time
        episode
        media {
          id
          title {
            romaji
          }
          coverImage {
            large
          }
        }
      }
    }
  }
`;

const getAnilistSearchQuery = (query) => `
  query {
    Page(page: 1, perPage: 10) {
      media(search: "${query}") {
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

const getAnilistAnimeQuery = (id) => `
  query {
    Media(id: ${id}) {
      id
      title {
        romaji
        english
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
        coverImage {
          extraLarge
          large
          medium
        }
    }
  }
`;

const getAnilistBannerQuery = () => `
  query {
    Page {
      media(type: ANIME, sort: TRENDING_DESC) {
        coverImage {
          large
        }
      }
    }
  }
`;

module.exports = async (req, res) => {
  const { type } = req.query;

  if (req.method === "POST") {
    try {
      let query = '';
      switch (type) {
        case 'trending':
          query = getAnilistTrendingQuery();
          break;
        case 'upcoming':
          query = getAnilistUpcomingQuery();
          break;
        case 'search':
          const { query: searchQuery } = req.body;  // Destructure the query parameter from body
          if (!searchQuery) {
            return res.status(400).json({ error: "Search query is required" });
          }
          query = getAnilistSearchQuery(searchQuery);
          break;
        case 'info':
          const { id } = req.query;  // Destructure the id parameter from body
          if (!id) {
            return res.status(400).json({ error: "Anime ID is required" });
          }
          query = getAnilistAnimeQuery(id);
          break;
        case 'banner':
          query = getAnilistBannerQuery();
          break;
        default:
          res.status(400).json({ error: "Invalid endpoint type" });
          return;
      }

      const data = await fetchAnilistData(query);
      
      // Send the response based on the endpoint type
      let result;
      if (type === 'trending') {
        result = data.data.Page.media;
      } else if (type === 'upcoming') {
        result = data.data.Page.airingSchedules;
      } else if (type === 'search') {
        result = data.data.Page.media;
      } else if (type === 'info') {
        let anime = data.data.Media;
        anime.recommendations = anime.recommendations.edges.map(edge => edge.node.mediaRecommendation);
        result = anime;
      } else if (type === 'banner') {
        result = data.data.Page.media.map(item => item.coverImage.large);
      }

      res.status(200).json({ results: result });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  } else {
    res.status(405).json({ error: "Method Not Allowed" });
  }
};
