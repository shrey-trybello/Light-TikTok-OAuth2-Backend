# 🚀 Light weight TikTok OAuth2 Server 
[CyberBlueCollarBrandon](https://linktr.ee/CyberBlueCollarBrandon)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A simple, secure, local TikTok OAuth2 server with PKCE support and encrypted token storage. Perfect for integrating TikTok authentication flow into your local workflow.
I created this mostly to workaround the issue of n8n TikTok OAuth2 flow not working and no n8n TikTok node, so this project proxy the auth and token management flow with a local endpoint. 
(And I also hoped to proxy functionalities like direct video posting, but failed. Reason [here](https://community.n8n.io/t/http-request-node-not-sending-authorization-header-despite-selecting-connected-oauth2-credential-tiktok-api/99963/4).)

## ✨ Features

- 🔐 **PKCE Support** - Implements TikTok's required PKCE (Proof Key for Code Exchange) flow
- 🔒 **Encrypted Token Storage** - Secure AES-256 encryption for persistent token storage
- 📱 **TikTok API Integration** - Ready-to-use endpoints for TikTok API calls
- 🔄 **Auto Token Refresh** - Automatic token refresh before expiration
- 🚀 **Expandable TikTok API Proxies** - Add your own API endpoints

## 🚀 Quick Start

### Prerequisites

- Node.js 14+ 
- TikTok Developer Account
- npm or yarn

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/tiktok-oauth2-server.git
cd tiktok-oauth2-server
npm install
```

### 2. Configure TikTok App

1. Go to [TikTok for Developers](https://developers.tiktok.com/)
2. Create a new app or use existing one
3. Add redirect URI: `http://localhost:[port]/auth/callback`
4. Copy your **Client Key** and **Client Secret**

### 3. Setup Environment

```bash
cp env.example .env
```

Edit `.env` with your credentials:

```env
# TikTok OAuth2 Configuration
TIKTOK_CLIENT_KEY=your_tiktok_client_key_here
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret_here
TIKTOK_REDIRECT_URI=http://localhost:7777/auth/callback

# Server Configuration
PORT=7777

# Security (generate a strong random key)
ENCRYPTION_KEY=your-super-secret-token-encryption-key-here
```

### 4. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

Visit `http://localhost:[port]/auth/login` to start the OAuth2 flow!

## 📖 Usage

### OAuth2 Flow

1. **Start Authentication**: Visit `/auth/login`
2. **Complete TikTok Login**: User authenticates on TikTok
3. **Get Tokens**: Server receives and stores encrypted tokens
4. **Use API**: Call `/creator-info` to test TikTok API

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | GET | Start OAuth2 flow (redirects to TikTok) |
| `/auth/callback` | GET | OAuth2 callback handler |
| `/creator-info` | GET | Get TikTok creator information |
| `/video/direct-post` | POST | Upload video directly to TikTok |
| `/video/status` | GET | Check video upload status |

### Example API Usage

```javascript
// Get creator info
const response = await fetch('http://localhost:7777/creator-info');
const creatorData = await response.json();
console.log(creatorData);
```

### Video Upload (Example API usage) 

I added a simple example for direct video upload to TikTok using TikTok's official API. This has limitations (explained at top).


#### Video Upload Process

The video upload follows TikTok's two-step process:

1. **Initialize Upload**: The server calls TikTok's initialization endpoint with video metadata
2. **Upload File**: The video file is uploaded to TikTok's designated URL
3. **Status Tracking**: Use the returned `publish_id` to track upload progress

#### Example Workflow

```bash
# 1. Complete OAuth2 authentication
curl http://localhost:7777/auth/login

# 2. Upload a video
curl -X POST http://localhost:7777/video/direct-post \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "/home/user/videos/my_video.mp4",
    "title": "Check out this amazing content! #fyp #viral #trending"
  }'

# 3. Check upload status (replace with actual publish_id)
curl "http://localhost:7777/video/status?publish_id=abc123def456"
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TIKTOK_CLIENT_KEY` | ✅ | Your TikTok app client key |
| `TIKTOK_CLIENT_SECRET` | ✅ | Your TikTok app client secret |
| `TIKTOK_REDIRECT_URI` | ✅ | OAuth2 redirect URI |
| `PORT` | ❌ | Server port (default: 7777) |
| `ENCRYPTION_KEY` | ❌ | Encryption key for token storage |

### Scopes

The server requests these TikTok scopes:
- `user.info.basic` - Basic user information
- `user.info.profile` - User profile data
- `user.info.stats` - User statistics
- `video.publish` - Video publishing permissions
- `video.upload` - Video upload permissions



## 📁 Project Structure

```
tiktok-oauth2-server/
├── index.js              # Main server file
├── tokenStorage.js       # Encrypted token storage
├── setup.js              # Setup helper (optional)
├── package.json          # Dependencies and scripts
├── env.example           # Environment template
├── README.md             # This file
├── LICENSE               # MIT License
├── .gitignore            # Git ignore rules
└── tokens.encrypted.json # Encrypted tokens (auto-created)
```

## 🔄 Token Management

The server automatically handles:

- **Token Storage**: Encrypted persistence across restarts
- **Token Refresh**: Automatic refresh before expiration
- **Error Recovery**: Graceful handling of token errors
- **Security**: Secure encryption and cleanup

## 🚀 Deployment


### Environment Variables

Set these in your deployment platform:
- `TIKTOK_CLIENT_KEY`
- `TIKTOK_CLIENT_SECRET`
- `TIKTOK_REDIRECT_URI`
- `ENCRYPTION_KEY`


## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Invalid redirect URI" | Check TikTok app settings |
| "Code verifier invalid" | Ensure PKCE is properly implemented |
| "Token expired" | Server should auto-refresh |
| "Encryption failed" | Check ENCRYPTION_KEY |

### Debug Mode

```bash
DEBUG=* npm run dev
```


---

⭐ **Star this repository if it helped you!** 