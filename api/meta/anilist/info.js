const { GraphQLClient } = require('graphql-request');
const client = new GraphQLClient('https://graphql.anilist.co');

const animeInfoQuery = `
  query($id: Int) {
    Media(id: $id) {
      id
      title {
        userPreferred
      }
      description
      coverImage {
        large
      }
    }
  }
`;

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Anime ID is required' });
  }

  try {
    const data = await client.request(animeInfoQuery, { id: parseInt(id) });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch anime info' });
  }
}
