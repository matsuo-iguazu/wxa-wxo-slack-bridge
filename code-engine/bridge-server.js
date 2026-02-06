/**
 * wxa-wxo-slack-bridge
 * Relay server between watsonx Assistant and Slack
 * Deploy to: IBM Code Engine
 */

const express = require('express');
const https = require('https');
const crypto = require('crypto');
const app = express();

// Slackリクエストの署名検証用に生のボディを保持
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString('utf8');
    }
}));

// --- CORS Configuration ---
// 許可するオリジンのリスト（環境変数で設定可能）
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : []; // 未設定時は空配列（開発環境用に後でフォールバック）

app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // 開発環境対応: ALLOWED_ORIGINS未設定時は全オリジン許可
    if (ALLOWED_ORIGINS.length === 0) {
        res.header("Access-Control-Allow-Origin", "*");
    } else if (origin && ALLOWED_ORIGINS.includes(origin)) {
        // 許可リストに含まれるオリジンのみ許可
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Access-Control-Allow-Credentials", "true");
    } else if (origin) {
        // 許可されていないオリジンからのリクエスト
        console.warn(`⚠️ CORS拒否: ${origin} (許可リスト: ${ALLOWED_ORIGINS.join(', ')})`);
        // ヘッダーを設定しないことで、ブラウザがリクエストをブロック
    }
    
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// --- Environment Variables ---
// Code Engineの環境変数として設定してください
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;

// メッセージキュー（後でセッション管理に改善予定）
let pendingMessages = [];

/**
 * Slack署名検証関数
 * Slackからのリクエストが正規のものであることを検証
 * @param {Object} req - Expressリクエストオブジェクト
 * @returns {boolean} - 検証結果
 */
function verifySlackSignature(req) {
    if (!SLACK_SIGNING_SECRET) {
        console.warn('⚠️ SLACK_SIGNING_SECRET が設定されていません。署名検証をスキップします。');
        return true; // 開発環境用：シークレット未設定時は検証スキップ
    }

    const slackSignature = req.headers['x-slack-signature'];
    const timestamp = req.headers['x-slack-request-timestamp'];
    const body = req.rawBody;

    // タイムスタンプチェック（リプレイアタック防止）
    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - timestamp) > 60 * 5) {
        console.error('❌ リクエストのタイムスタンプが古すぎます');
        return false;
    }

    // 署名の計算
    const sigBasestring = `v0:${timestamp}:${body}`;
    const mySignature = 'v0=' + crypto
        .createHmac('sha256', SLACK_SIGNING_SECRET)
        .update(sigBasestring)
        .digest('hex');

    // 署名の比較（タイミング攻撃対策）
    const isValid = crypto.timingSafeEqual(
        Buffer.from(mySignature, 'utf8'),
        Buffer.from(slackSignature, 'utf8')
    );

    if (!isValid) {
        console.error('❌ Slack署名検証に失敗しました');
    }

    return isValid;
}

/**
 * ヘルスチェックエンドポイント
 * サーバーの稼働状態を確認
 */
app.get('/health', (req, res) => {
    res.status(200).send({ status: "UP" });
});

/**
 * 有人エージェント接続の初期化 (/init)
 * Web Chatから有人チャットがリクエストされた時に呼ばれる
 */
app.post('/init', (req, res) => {
    console.log("🚀 有人エージェントセッションを開始しました");
    sendToSlack(SLACK_CHANNEL_ID, "⚠️ **有人チャット依頼**\nユーザーが接続されました。応答を開始してください。");
    
    // 前回のセッションメッセージをクリア
    pendingMessages = [];
    
    res.status(200).json({
        agent_id: "slack-agent",
        nickname: "Slack担当者"
    });
});

/**
 * ユーザーメッセージの転送 (/message)
 * GaroonユーザーからのメッセージをSlackに転送
 */
app.post('/message', (req, res) => {
    // wxAペイロードから柔軟にテキストを抽出
    const userText = req.body.text ||
                     (req.body.message && req.body.message.input && req.body.message.input.text) ||
                     (Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : "Empty Message");

    console.log("📤 Slackへメッセージを転送:", userText);
    sendToSlack(SLACK_CHANNEL_ID, `👤 ユーザー: ${userText}`);
    res.status(200).json({ status: "delivered" });
});

/**
 * Slack Event Subscriptions (/slack/events)
 * Slackからのイベントを受信し、メッセージをキューに追加
 */
app.post('/slack/events', (req, res) => {
    // URL Verification for Slack App Setup（初回セットアップ時のみ）
    if (req.body.type === 'url_verification') {
        console.log('✅ Slack URL検証リクエストを受信');
        return res.status(200).send(req.body.challenge);
    }

    // 署名検証（本番環境では必須）
    if (!verifySlackSignature(req)) {
        console.error('❌ 不正なSlackリクエストを拒否しました');
        return res.status(401).send('Unauthorized');
    }

    const event = req.body.event;
    // メッセージイベントのフィルタリング: ボットメッセージとサブタイプ（参加/退出等）を除外
    if (event && event.type === 'message' && !event.bot_id && !event.subtype) {
        console.log("📩 Slackからメッセージを受信:", event.text);
        pendingMessages.push({
            text: event.text,
            agent_name: "Slack担当者"
        });
    }
    res.status(200).send("OK");
});

/**
 * ポーリングエンドポイント (/poll)
 * Web ChatがSlackからのメッセージを定期的に取得
 */
app.get('/poll', (req, res) => {
    const messages = [...pendingMessages];
    pendingMessages = []; // キューをクリア
    res.status(200).json({ messages: messages });
});

/**
 * ヘルパー関数: Slack APIへメッセージを送信
 * @param {string} channel - 送信先チャンネルID
 * @param {string} text - 送信するメッセージテキスト
 */
function sendToSlack(channel, text) {
    console.log(`📤 Slackへメッセージ送信を試行: チャンネル=${channel}`);
    
    const postData = JSON.stringify({ channel: channel, text: text });
    const options = {
        hostname: 'slack.com',
        path: '/api/chat.postMessage',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
            responseData += chunk;
        });
        
        res.on('end', () => {
            try {
                const response = JSON.parse(responseData);
                if (response.ok) {
                    console.log(`✅ Slackメッセージ送信成功: ${text.substring(0, 50)}...`);
                } else {
                    console.error(`❌ Slack API エラー: ${response.error}`);
                    console.error(`詳細: ${JSON.stringify(response)}`);
                }
            } catch (e) {
                console.error(`❌ Slackレスポンス解析エラー: ${e.message}`);
                console.error(`レスポンス: ${responseData}`);
            }
        });
    });
    
    req.on('error', (e) => {
        console.error("❌ Slack API リクエストエラー:", e);
    });
    
    req.write(postData);
    req.end();
}

// サーバー起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 中継サーバーがポート ${PORT} で起動しました`);
    console.log(`📝 環境変数の確認:`);
    console.log(`   - SLACK_BOT_TOKEN: ${SLACK_BOT_TOKEN ? '✅ 設定済み' : '❌ 未設定'}`);
    console.log(`   - SLACK_CHANNEL_ID: ${SLACK_CHANNEL_ID ? '✅ 設定済み' : '❌ 未設定'}`);
    console.log(`   - SLACK_SIGNING_SECRET: ${SLACK_SIGNING_SECRET ? '✅ 設定済み' : '❌ 未設定'}`);
    console.log(`   - ALLOWED_ORIGINS: ${ALLOWED_ORIGINS.length > 0 ? `✅ ${ALLOWED_ORIGINS.length}件設定済み` : '⚠️ 未設定（全オリジン許可）'}`);
    if (ALLOWED_ORIGINS.length > 0) {
        ALLOWED_ORIGINS.forEach(origin => console.log(`      • ${origin}`));
    }
});