/**
 * wxa-wxo-slack-bridge
 * Relay server between watsonx Assistant and Slack
 * Deploy to: IBM Code Engine
 */

const express = require('express');
const https = require('https');
const app = express();

app.use(express.json());

// --- CORS Configuration ---
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// --- Environment Variables ---
// Set these in Code Engine environment variables
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

let pendingMessages = [];

/**
 * Health Check
 */
app.get('/health', (req, res) => {
    res.status(200).send({ status: "UP" });
});

/**
 * Initialize Escalation (/init)
 */
app.post('/init', (req, res) => {
    console.log("Escalation session initiated.");
    sendToSlack(SLACK_CHANNEL_ID, "⚠️ **有人チャット依頼**\nユーザーが接続されました。応答を開始してください。");
    
    // Clear previous session messages
    pendingMessages = [];
    
    res.status(200).json({ 
        agent_id: "slack-agent", 
        nickname: "Slack担当者" 
    });
});

/**
 * Message from User (/message)
 */
app.post('/message', (req, res) => {
    // Robust text extraction from wxA payload
    const userText = req.body.text ||
                     (req.body.message && req.body.message.input && req.body.message.input.text) ||
                     (Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : "Empty Message");

    console.log("Relaying to Slack:", userText);
    sendToSlack(SLACK_CHANNEL_ID, `👤 ユーザー: ${userText}`);
    res.status(200).json({ status: "delivered" });
});

/**
 * Slack Event Subscriptions (/slack/events)
 */
app.post('/slack/events', (req, res) => {
    // URL Verification for Slack App Setup
    if (req.body.type === 'url_verification') {
        return res.status(200).send(req.body.challenge);
    }

    const event = req.body.event;
    // Filter messages: Ignore bots and subtypes (like join/leave)
    if (event && event.type === 'message' && !event.bot_id && !event.subtype) {
        console.log("Message captured from Slack:", event.text);
        pendingMessages.push({
            text: event.text,
            agent_name: "Slack担当者"
        });
    }
    res.status(200).send("OK");
});

/**
 * Polling for wxA (/poll)
 */
app.get('/poll', (req, res) => {
    const messages = [...pendingMessages];
    pendingMessages = [];
    res.status(200).json({ messages: messages });
});

/**
 * Helper: Send Message to Slack API
 */
function sendToSlack(channel, text) {
    const postData = JSON.stringify({ channel: channel, text: text });
    const options = {
        hostname: 'slack.com',
        path: '/api/chat.postMessage',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SLACK_BOT_TOKEN}`
        }
    };
    const req = https.request(options, (res) => {
        res.on('data', (d) => { /* console.log(d); */ });
    });
    req.on('error', (e) => { console.error("Slack API Error:", e); });
    req.write(postData);
    req.end();
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Relay server running on port ${PORT}`));