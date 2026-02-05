# Garoon への実装手順

Garoon 上で watsonx Assistant (wxA) の Web Chat を表示し、Assitantとのチャットと有人チャット連携を有効にするための設定手順です。

## 1. ファイルの準備
`wxa-web-chat.js` をエディタで開き、先頭にある `CONFIG` の 4 つのパラメータを自身の環境に合わせて書き換えます。

- **CE_BASE_URL**: 
  - Code Engine でアプリをデプロイした後に参照可能な **ドメイン・マッピング** の **パブリック** のURL に書き換えます。
- **INTEGRATION_ID / REGION / SERVICE_INSTANCE_ID**:
  - wxA の管理画面 > [Integrations] > [Web chat] の [Embed] タブ内にあるコードサンプルから値を確認してコピーします。
    - integrationID
    - region
    - serviceInstanceID

## 2. Garoon での定義操作
Garoon のシステム管理画面から、以下の手順でファイルを適用します。

1. **Garoon システム管理** を開く
2. **カスタマイズ** を選択 **JavaScript / CSSによるカスタマイズ** を選択
3. **カスタマイズグループを追加する** をクリックして新規作成
4. 設定項目を以下のように指定：
   - **カスタマイズ**: 「適用する」を選択
   - **カスタマイズグループ名**: 任意
   - **JavaScript カスタマイズ**: の **ファイルの追加** で書き換えた `wxa-web-chat.js` をアップロードして登録
5. 「追加する」をクリックして保存

以上で、Garoon Webページの画面右下にチャットアイコンが表示されます。