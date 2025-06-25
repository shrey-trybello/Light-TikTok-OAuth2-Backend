require('dotenv').config();
const express = require('express');
const axios = require('axios');
const qs = require('querystring');
const crypto = require('crypto');
const SecureTokenStorage = require('./tokenStorage');

const app = express();
const PORT = process.env.PORT;

// Initialize secure storage with encryption key from environment
const tokenStorage = new SecureTokenStorage(process.env.ENCRYPTION_KEY);

// Store code verifier for PKCE flow
let codeVerifier = null;

// Generate random string for code verifier (TikTok's official method)
function generateRandomString(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// Generate PKCE code verifier and challenge (TikTok's official method)
function generatePKCE() {
  // Generate random code verifier (43-128 characters as per TikTok docs)
  const verifier = generateRandomString(64); // Using 64 characters for good entropy
  
  // Generate code challenge using SHA256 with hex encoding (TikTok's method)
  const challenge = crypto.createHash('sha256').update(verifier).digest('hex');
  
  return { verifier, challenge };
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint with basic info
app.get('/', (req, res) => {
  res.json({
    name: 'TikTok OAuth2 Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/auth/login',
      callback: '/auth/callback',
      creator_info: '/creator-info',
      health: '/health'
    }
  });
});

// 1. Redirect user to TikTok auth page with PKCE
app.get('/auth/login', (req, res) => {
  // Generate PKCE code verifier and challenge
  const pkce = generatePKCE();
  codeVerifier = pkce.verifier; // Store for later use in callback

  const params = {
    client_key: process.env.TIKTOK_CLIENT_KEY,
    redirect_uri: process.env.TIKTOK_REDIRECT_URI,
    response_type: 'code',
    scope: 'user.info.basic,user.info.profile,user.info.stats,video.publish,video.upload',
    state: 'secureRandomState123', // optional
    code_challenge: pkce.challenge,
    code_challenge_method: 'S256'
  };

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${qs.stringify(params)}`;
  res.redirect(authUrl);
});

// 2. Callback endpoint to handle TikTok redirect with PKCE
app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing code');
  
  if (!codeVerifier) return res.status(400).send('No code verifier found');

  //console.log('Callback received - Code:', code);
  //console.log('Stored code verifier:', codeVerifier);

  try {
    const requestData = new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.TIKTOK_REDIRECT_URI,
      code_verifier: codeVerifier
    });

    const tokenRes = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', requestData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });
    //console.log('Token Response:', tokenRes.data);
    
    if (tokenRes.data.error) {
      return res.status(400).send(`Error: ${tokenRes.data.error}, Description: ${tokenRes.data.error_description}`);
    }
    if (!tokenRes.data.access_token) {
      return res.status(400).send('Access token not received');
    }

    const { access_token, refresh_token, expires_in } = tokenRes.data;

    // Save tokens securely
    tokenStorage.saveTokens({
      access_token,
      refresh_token,
      expires_at: Date.now() + expires_in * 1000
    });

    // Clear code verifier after successful token exchange
    codeVerifier = null;

    res.send('Login successful. Tokens acquired. Test usage at http://localhost:${PORT}/creator-info');
  } catch (err) {
    console.error('Token exchange error:', err.response?.data || err.message);
    res.status(500).send('Token exchange failed');
  }
});

// 3. Auto-refresh access token if expired
async function getValidAccessToken() {
  const tokens = tokenStorage.loadTokens();
  if (!tokens) {
    throw new Error(`No tokens available. Please complete OAuth flow first. Visit http://localhost:${PORT}/auth/login`);
  }

  if (Date.now() < tokens.expires_at - 60 * 1000) {
    return tokens.access_token;
  }

  console.log('Refreshing TikTok access token...');
  const refreshRes = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', {
    client_key: process.env.TIKTOK_CLIENT_KEY,
    client_secret: process.env.TIKTOK_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: tokens.refresh_token,
  });

  const { access_token, refresh_token, expires_in } = refreshRes.data;

  // Save new tokens
  tokenStorage.saveTokens({
    access_token,
    refresh_token,
    expires_at: Date.now() + expires_in * 1000
  });

  return access_token;
}

// 4. Test by calling TikTok API creator_info with access token
app.get('/creator-info', async (req, res) => {
  try {
    const access_token = await getValidAccessToken();

    const profile = await axios.post('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', {}, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
    });

    res.json(profile.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send('API call failed');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 TikTok OAuth2 Server running at http://localhost:${PORT}`);
  console.log(`📖 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Perform OAuth flow: http://localhost:${PORT}/auth/login`);
}); 