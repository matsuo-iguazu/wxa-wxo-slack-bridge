# 変更履歴 (CHANGELOG)

## [1.2.0] - 2026-02-13

### ✨ 機能追加・改善
- **wxA Extension: リージョン対応**
  - `wxo-agent-access.json`にServer Variables機能を追加
  - `region`と`instanceid`をExtension追加時に指定可能に
  - 複数リージョン（us-south, jp-tok, eu-de, eu-gb）に対応

- **Session Variables方式への移行**
  - API KeyとAgent IDをSession Variablesで管理
  - `ibm_cloud_api_key`, `wxo_agent_id_a`, `wxo_agent_id_b`の3変数を定義
  - 複数Actionで変数を共有可能に

### 📝 ドキュメント改善
- **extensions/README.mdの全面改訂**
  - セットアップ手順を詳細化（5ステップ構成）
  - Extension登録手順を明確化
  - Extensionステップの再設定手順を追加
  - セキュリティに関する注意事項を追加

### ⚠️ 重要な変更
- **Protected Session Variables機能の非採用**
  - 当初検討したProtected設定は実質的な保護機能が不十分と判明
  - Variables編集画面やエクスポート時に生の値が表示される
  - 通常のSession Variablesとして運用（`privacy.enabled: false`）
  - 運用ルールの徹底で対応（エクスポートファイルのコミット禁止など）

### 🔧 技術的変更
- **wxa-wxo-slack-action.json更新**
  - Session Variables定義を追加（初期値なし）
  - API Key参照を`skill_variable`方式に変更
  - Agent ID参照を`skill_variable`方式に変更
  - Extension参照情報は環境依存のため`null`のまま維持

---

## [1.1.0] - 2026-02-06

### 🔒 セキュリティ改善
- **Slack署名検証の実装**: Slackからのリクエストの正当性を検証する機能を追加
  - HMAC-SHA256による署名検証
  - タイムスタンプチェックによるリプレイアタック防止（5分以内のリクエストのみ受付）
  - タイミング攻撃対策（crypto.timingSafeEqual使用）
  - 開発環境用の検証スキップ機能（SLACK_SIGNING_SECRET未設定時）

- **CORS設定の厳格化**: オリジンベースのアクセス制御を実装
  - 環境変数`ALLOWED_ORIGINS`による許可オリジンの指定
  - Garoonドメインのみを許可することで不正アクセスを防止
  - 未設定時は全オリジン許可（開発環境向け）
  - 許可/拒否のログ出力で動作確認が容易

### ✨ 機能追加
- **環境変数の起動時チェック**: サーバー起動時に必要な環境変数の設定状態を表示
  - ALLOWED_ORIGINSの設定件数と内容を表示
- **詳細なログ出力**: 各処理に絵文字付きの分かりやすいログメッセージを追加
  - CORS許可/拒否の詳細ログ

### 📝 ドキュメント改善
- **日本語コメントの追加**: 全関数とエンドポイントに詳細な日本語コメントを追加
- **タイポ修正**: `slack/README.md`の`menifest.json`を`manifest.json`に修正
- **READMEの更新**: Slack Signing Secretの必要性を明記

### 🔧 技術的変更
- **package.json更新**: バージョンを1.1.0に更新、crypto依存関係を追加
- **リクエストボディの保持**: 署名検証のため生のリクエストボディを保持する仕組みを実装

### 🔧 技術的改善
- **package-lock.jsonの追加**: 依存関係のバージョンを固定
  - 全環境で同じバージョンの依存関係を保証
  - ビルドの再現性向上
  
- **Dockerfileの最適化**: セキュリティと運用性の向上
  - 非rootユーザー（appuser）での実行
  - `npm ci`による高速で正確なインストール
  - ヘルスチェック機能の追加
  - npmキャッシュのクリーンアップ

###  既知の制限事項（今後の改善予定）
- セッション管理が単一ユーザーのみ対応（マルチユーザー対応は次バージョン）
- Slackスレッド管理が未実装
- エラーハンドリングが基本的なレベル

---

## [1.0.0] - 初回リリース

### 初期機能
- watsonx Assistant と Slack の基本的な中継機能
- Garoon Web Chat との統合
- watsonx Orchestrate Extensions 定義
- IBM Code Engine へのデプロイ対応