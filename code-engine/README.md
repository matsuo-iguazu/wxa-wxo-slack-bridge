# Code Engine (Bridge Server) デプロイ手順

watsonx Assistant と Slack のメッセージを仲介する中継サーバーを IBM Code Engine にデプロイします。

## 1. 準備するもの
- IBM Cloud アカウント
    - Code Engine
    - Container Registry（レジストリー・サーバー(registry)/名前空間(namespace)）
    - IAM API キー
- Slack環境アプリケーション定義（Slack環境構築後に入手）
    - Slack Bot トークン (`xoxb-...`)
    - Slack Signing Secret（署名検証用）
    - Slack チャンネル ID (`C...`)

## 2. イメージのbuildとpush
ローカル環境で Docker イメージをビルドし、コンテナレジストリへ push します。

#### ローカル環境にファイルを配置する
以下ファイルをローカルディレクトリに置きます。
- bridge-server.js
- Dockerfile
- package.json

#### IBM Cloud Container Registoryにログイン
```bash
# ibmcloud CLIでログイン
# IBM Cloud コンソールのアバターメニュー「CLIとAPIにログイン」で取得します。ログイン後リージョンを選択します。
ibmcloud login -a https://cloud.ibm.com -u passcode -p xxxxxxxxxx

# Container Registoryログイン
ibmcloud cr login
```
#### イメージのビルドとpush
```bash
# 1. ビルド（リポジトリ名に合わせてタグ付け）
## 例: docker build -t us.icr.io/cr-namespace/wxa-wxo-slack-bridge:v1 .
docker build -t <registry>/<namespace>/wxa-wxo-slack-bridge:v1 .

# 2. レジストリへプッシュ
## 例: docker push us.icr.io/cr-namespace/wxa-wxo-slack-bridge:v1
docker push <registry>/<namespace>/wxa-wxo-slack-bridge:v1
```
注意：pushされたイメージは最低限のコードのため、コンソール「セキュリティ状況」は”問題あり”と表示されます

## 3. デプロイ設定

### 3.1. レジストリ・シークレットの作成
Container Registry (ICR) にあるプライベートイメージを Code Engine にデプロイするため、**レジストリ・シークレット** の作成が必須です。

1.  Code Engine プロジェクトのメニューから **[シークレットおよび configmap]** を選択。
2.  **[作成] > [レジストリ・シークレット]** をクリック。
3.  以下の情報を入力して保存：
    - **シークレット名**: `wxa-wxo-slack-bridge` (任意)
    - **ロケーション**: `東京（private.jp.icr.io）` (または利用中のリージョン)
    - **IAM API キー**: `ご自身の IBM Cloud IAM API Key`

### 3.2. イメージの仮デプロイ
Slack関連環境変数が無い状態でコードのデプロイを仮に行います。

Code Engineの **アプリケーション** メニューから「作成 +」で進み以下の内容を定義します。
- 名前: 任意（例:`wxa-wxo-slack-bridge`)

**イメージの構成** ボタンのメニューで以下を入力して定義
- レジストリー・サーバー: 利用中のサーバー　(例:`private.us.icr.io`)
)
- レジストリーシークレット: `上記作業で登録済みのシークレット名`
- 名前空間: 利用中の名前空間　(例:`cr-namespace`)
- リポジトリ（イメージ名）: `wxa-wxo-slack-bridge`
- タグ: `v1`

**リソースおよびスケーリング, イメージ始動オプション**: 
- デフォルトで実行可能

### 3.3 パブリックURLの採取
デプロイが成功したら、**ドメイン・マッピング** タブから以下のURLを控える。SlackのManifestファイルに記載します。

システム・ドメイン・マッピング > **パブリック**

※以上でCode Engineでの作業を中断し、Slackの設定を行います。※

### 3.4 環境変数の設定 (Slack設定後の作業)

**環境変数** (アプリケーション画面の **構成** タブ)

Slack から取得した情報を Code Engine に反映させます。

1.  Code Engine の対象アプリケーションのコンソールで [構成] > [環境変数] を開く。
2.  以下の変数を追加する（リテラル値）。

#### 必須の環境変数
| 変数名 | 説明 | 取得元 |
|--------|------|--------|
| `SLACK_BOT_TOKEN` | Slack Bot User OAuth Token | Slack App管理画面 > OAuth & Permissions |
| `SLACK_SIGNING_SECRET` | Slack署名検証用シークレット | Slack App管理画面 > Basic Information > App Credentials |
| `SLACK_CHANNEL_ID` | 通知先チャンネルID | Slackチャンネル詳細（`C`で始まる文字列） |

#### オプションの環境変数（セキュリティ強化）
| 変数名 | 説明 | 設定例 |
|--------|------|--------|
| `ALLOWED_ORIGINS` | CORS許可オリジン（カンマ区切り）<br>**未設定でも動作**しますが、本番環境では設定を推奨 | `https://your-company.cybozu.com` |

**ALLOWED_ORIGINS の設定について:**
- **未設定の場合**: 全オリジンからのアクセスを許可（開発・検証環境向け）
- **設定する場合**: Garoonのドメインを指定（例: `https://xxxxx.cybozu.com`）
- **複数環境がある場合**: カンマ区切りで複数指定可能（例: `https://prod.cybozu.com,https://test.cybozu.com`）
- **効果**: 指定したGaroonドメイン以外からのアクセスをブロック

3.  [**変更をリビジョンとしてデプロイ**] の **[デプロイ]** をクリックして再デプロイ。

以上の作業で、wxAとSlackとを中継するサーバーが稼働可能になります。
