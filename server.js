const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const app = express();
const port = 8000;

// Retrieve environment variables
const clientId = process.env.CLIENT_ID;  // Spotify client ID
const clientSecret = process.env.CLIENT_SECRET;  // Spotify client secret
const redirectUri = 'http://localhost:8000/callback';  // Ensure this matches the registered redirect URI

// Middleware setup
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Session middleware configuration
app.use(session({
    secret: process.env.SESSION_SECRET,  // Secret key for session
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // Set to true if using HTTPS
}));

// Route for the home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route for initiating Spotify login
app.get('/login', (req, res) => {
    const scope = 'playlist-modify-private playlist-modify-public user-read-private user-read-email';
    const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    res.redirect(authUrl);
});

// Callback route for handling Spotify authentication response
app.get('/callback', async (req, res) => {
    const code = req.query.code;

    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', null, {
            params: {
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUri,
                client_id: clientId,
                client_secret: clientSecret,
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token } = response.data;
        // Store the access token in the session
        req.session.accessToken = access_token;
        res.redirect('/success');
    } catch (error) {
        console.error('Error getting access token:', error.response ? error.response.data : error.message);
        res.send('Error getting access token');
    }
});

// Success route to display after successful login
app.get('/success', (req, res) => {
    if (!req.session.accessToken) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'success.html'));
});

// Endpoint to get access token from session
app.get('/api/token', (req, res) => {
    if (!req.session.accessToken) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({ access_token: req.session.accessToken });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
