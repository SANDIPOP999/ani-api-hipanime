export default function LandingPage() {
  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        textAlign: 'center',
        padding: '50px',
        backgroundColor: '#f4f4f9',
        color: '#333',
        minHeight: '100vh',
      }}
    >
      <h1>Welcome to the AniList API</h1>
      <p style={{ fontSize: '18px', margin: '20px 0' }}>
        This API provides anime-related data from AniList. Use the endpoints below to fetch specific information:
      </p>
      <table
        style={{
          margin: '0 auto',
          borderCollapse: 'collapse',
          width: '80%',
          maxWidth: '600px',
        }}
      >
        <thead>
          <tr style={{ backgroundColor: '#ddd' }}>
            <th style={{ padding: '10px', border: '1px solid #ccc' }}>Feature</th>
            <th style={{ padding: '10px', border: '1px solid #ccc' }}>Endpoint</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '10px', border: '1px solid #ccc' }}>Scheduled Anime</td>
            <td style={{ padding: '10px', border: '1px solid #ccc' }}>
              <code>/meta/anilist/scheduled</code>
            </td>
          </tr>
          <tr>
            <td style={{ padding: '10px', border: '1px solid #ccc' }}>Trending Anime</td>
            <td style={{ padding: '10px', border: '1px solid #ccc' }}>
              <code>/meta/anilist/trending</code>
            </td>
          </tr>
          <tr>
            <td style={{ padding: '10px', border: '1px solid #ccc' }}>Trending Banners</td>
            <td style={{ padding: '10px', border: '1px solid #ccc' }}>
              <code>/meta/anilist/banner</code>
            </td>
          </tr>
          <tr>
            <td style={{ padding: '10px', border: '1px solid #ccc' }}>Anime Info</td>
            <td style={{ padding: '10px', border: '1px solid #ccc' }}>
              <code>/meta/anilist/info?id=ANIME_ID</code>
            </td>
          </tr>
        </tbody>
      </table>
      <p style={{ marginTop: '20px', color: '#666' }}>
        Built with ❤️ by <strong>Anonymous-Kun</strong>.
      </p>
    </div>
  );
}
