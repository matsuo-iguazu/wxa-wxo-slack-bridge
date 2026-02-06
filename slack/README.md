# Slack App セットアップ手順

有人エージェントのチャットインターフェースであるSlack Appの設定手順です。

## 1. マニフェストファイルの準備
マニフェストファイル `menifest.json` 内の以下の箇所を、自分の Code Engine の URL(`https://~.appdomain.cloud`) に書き換えてください。URLの末尾に/slack/eventsを付与します。
- `settings` > `event_subscriptions` > `request_url`
  - 形式: `[YOUR_CODE_ENGINE_URL]/slack/events`

## 2. Slack App の作成

1. アプリの作成
    1. [Slack API Console](https://api.slack.com/apps) にアクセスし、**[Create New App]** をクリック。
    2. **[From a manifest]** を選択。
    3. アプリをインストールする **Workspace** を選択。
    4. [Enter app manifest below] 画面で **JSON** タブを選択し、`manifest.json` の中身をコピー＆ペースト。
    5. [Next]>[Create]tと操作しアプリケーション作成を完了します。
2. ワークスペースへのインストール

    1. アプリのセットアップ画面の **Install APP** タブで表示される **[Install to _Workspace_]** を開き **[許可する]** を行う

## 3. 認証情報の取得
以下の 2 つの値をメモして Code Engine の環境変数に設定してください。
- **Bot User OAuth Token**: `xoxb-` で始まるトークン（[OAuth & Permissions] 画面にあります）。`SLACK_BOT_TOKEN` に設定してください。
- **Signing Secret**: アプリの秘密鍵（[Basic Information] 画面の [App Credentials] 内にあります）。`SLACK_SIGNING_SECRET` に設定してください

## 4. チャンネルへのアプリ招待/チャンネルIDの取得
ユーザーとのやり取りを行うSlackチャンネルにアプリを招待し、チャンネルIDを取得します。

1. アプリを招待する
    1. 通知・チャットを行う Slack チャンネルを開きます。
    1. メッセージ入力欄で `/invite @wxa-wxo-agent `を入力・実行し、アプリをチャンネルに参加させす。
2. チャンネル ID の取得
    1. 対象のチャンネルを右クリック ＞ [**チャネル詳細を表示**]
    2. チャネル詳細ページの最下部の **チャネルID**`C0123456789`）をメモし、Code Engine の `SLACK_CHANNEL_ID` に設定してください。

## 6. Code Engine での環境変数設定
Slack から取得した情報を Code Engine に反映させます。

1.  Code Engine の対象アプリケーションのコンソールで [構成] > [環境変数] を開く。
2.  以下の 3 つの変数を追加する（リテラル値）。
    - `SLACK_BOT_TOKEN`
    - `SLACK_SIGNING_SECRET`
    - `SLACK_CHANNEL_ID`
3.  [**変更をリビジョンとしてデプロイ**] の **[デプロイ]** をクリックして再デプロイ。

## 7. 最終確認
1.  **URLの検証 (Event Subscriptions)**
    - アプリが再起動したら、Slack App 管理画面の [Event Subscriptions] を確認します。
    - **Request URL** が `Verified ✅` になっていれることを確認してください。
2.  **疎通テスト**
    - チャンネル内でアプリにメンション（`@wxa-wxo-agent Hello`）を送り、反応があるか確認します(アプリケーションのインスタンスが立ち上がるなど）。