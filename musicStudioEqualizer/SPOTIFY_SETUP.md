# 🎵 Spotify Web API Integration Setup

## 🔧 Developer Setup Instructions

To enable Spotify integration in your Power BI Music Player, follow these steps:

### 1. Create Spotify App
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click "Create App"
4. Fill in the details:
   - **App Name**: Power BI Music Player
   - **App Description**: Audio visualizer with Spotify integration
   - **Website**: Your Power BI report URL
   - **Redirect URI**: `http://localhost:8080/assets/` (for development)

### 2. Get Your Credentials
1. After creating the app, note down:
   - **Client ID** (public)
   - **Client Secret** (keep private!)

### 3. Update the Visual Code
In `src/visual.ts`, update these lines:

```typescript
// Replace with your actual Spotify credentials
private spotifyClientId: string = 'your-spotify-client-id-here';

// In the exchangeCodeForToken method, update:
client_secret: 'your-spotify-client-secret-here'
```

### 4. Production Considerations

⚠️ **IMPORTANT**: The current implementation includes the client secret in the frontend code, which is NOT secure for production use.

**For production, you should:**
1. Create a backend API proxy
2. Handle token exchange on your server
3. Never expose client secrets in frontend code

### 5. Available Features

✨ **Authentication**
- OAuth2 flow with Spotify
- Token refresh handling
- Secure token storage

🎵 **Music Streaming**
- Access user's playlists
- Search Spotify catalog
- Play tracks through Spotify Web API
- Real-time playback control

🎨 **Visual Integration**
- Track info display
- Playlist browsing
- Search results with album art
- Now playing indicator

### 6. Usage Instructions

1. **Connect to Spotify**: Click the "🎵 Connect Spotify" button
2. **Authenticate**: Complete OAuth flow in popup window
3. **Browse Playlists**: View your Spotify playlists in the left panel
4. **Search Music**: Use the search box to find tracks
5. **Play Music**: Click any track to start playback
6. **Visual Sync**: Music will sync with the 3D visualizations

### 7. API Endpoints Used

- `https://accounts.spotify.com/authorize` - OAuth authentication
- `https://accounts.spotify.com/api/token` - Token exchange/refresh
- `https://api.spotify.com/v1/me` - User profile
- `https://api.spotify.com/v1/me/playlists` - User playlists
- `https://api.spotify.com/v1/search` - Music search
- `https://api.spotify.com/v1/me/player/play` - Playback control
- `https://api.spotify.com/v1/me/player/currently-playing` - Now playing

### 8. Required Spotify Scopes

The integration requests these permissions:
- `streaming` - Play music through Web Playback SDK
- `user-read-email` - User profile access
- `user-read-private` - User profile access
- `user-library-read` - Saved music access
- `user-library-modify` - Save/remove tracks
- `user-read-playback-state` - Current playback info
- `user-modify-playback-state` - Control playback
- `playlist-read-private` - Private playlist access
- `playlist-read-collaborative` - Collaborative playlist access

### 9. Error Handling

The integration includes comprehensive error handling for:
- Authentication failures
- Token expiration
- API rate limiting
- Network connectivity issues
- Device availability

### 10. Browser Compatibility

Works with all modern browsers that support:
- ES6+ JavaScript
- Web Audio API
- Fetch API
- Local Storage
- Popup windows (for OAuth)

## 🎉 Result

Once configured, users can:
- Connect their Spotify account securely
- Browse and play their playlists
- Search the entire Spotify catalog
- Enjoy synchronized 3D visualizations
- Control playback seamlessly

The Spotify integration transforms the Power BI visual from a local music player into a full-featured streaming music visualizer! 🚀