# watsonx Assistant / Extensions セットアップ手順

watsonx Assistant (wxA) が watsonx Orchestrate (wxO)　にアクセス可能にするアシスタントとExtensionを以下の手順で行います。
いずれも当フォルダの各種定義ファイルを利用します。

## セットアップ手順

### 1. アシスタントの作成
1. トップメニューから「+新規作成」を選択。
2. **Assistant name**: `wxa-wxo-slack`（任意）
3. **Assistant language**: `Japanese`
4. 「Create assistant」をクリック。

### 2. Extension の登録（先に実施）

#### 2-1. IAMトークン取得用Extension
1. 左メニュー「Integrations」＞「Build custom extension」をクリック。
2. **Basic information**: Nameに `wxo-iam-token` と入力。
3. **Import OpenAPI**: `wxo-iam-token.json` をアップロード。
4. 「Finish」まで進む。
5. Integrations一覧の `wxo-iam-token` の「Add」をクリック。
6. 「Authentication」および「Review operations」をそのまま「Next」で進み「Finish」をクリック。

#### 2-2. wxOエージェントアクセス用Extension
1. 左メニュー「Integrations」＞「Build custom extension」をクリック。
2. **Basic information**: Nameに `wxo-agent-access` と入力。
3. **Import OpenAPI**: `wxo-agent-access.json` をアップロード。
4. 「Finish」まで進む。
5. Integrations一覧の `wxo-agent-access` の「Add」をクリック。
6. **Server variables**（リージョンとインスタンスID）:
   - `region`: wxOのリージョン（例: `us-south`, `jp-tok`, `eu-de`, `eu-gb`）
   - `instanceid`: wxOの「サービス・インスタンスURL」に含まれるUUID（ハイフンあり、例: `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`）
   - 「Next」で進み「Finish」をクリック。

### 3. Actions のインポート
1. 左メニュー「Actions」を選択。
2. 画面右上の歯車アイコン（Global Settings）をクリック。
3. 「Upload/Download」タブを選択。
4. `wxa-wxo-slack-action.json` をアップロード。
5. 「Upload」をクリック。「Upload and replace」をクリック。
6. CloseボタンでActionsメニューに戻る。3つのアクションが登録されていることを確認。

**注意**:
- Action JSONのインポートにより、Variables-Created by you に以下の3つを含む8つの変数が自動的に作成されます（初期値は空）：
  - `ibm_cloud_api_key` (String, Protected)
  - `wxo_agent_id_a` (String)
  - `wxo_agent_id_b` (String)
- Extensionを使用するステップ（Step 3, 6, 9）が赤色で「Missing extension」と表示されますが、これは正常です。次の手順で修正します。

### 4. Extensionステップの再設定（重要）

Actionsインポート時にExtension参照情報が失われるため、各ステップで手動でExtensionを再設定する必要があります。

#### 4-1. Variables-Created by you への値の設定

1. 左メニュー「Actions」を選択。
2. 「Variables」タブを選択。
3. 「Created by you」セクションで以下の変数に値を設定：

**`IBM Cloud API Key`**:
- 変数をクリックして編集
- **Initial value**: IBM Cloud IAM API Key を入力
- 「Save」をクリック

**`wxO Agent ID (話題A)`**:
- 変数をクリックして編集
- **Initial value**: 話題A用のwxOエージェントID（UUID形式）を入力
- 「Save」をクリック

**`wxO Agent ID (話題B)`**:
- 変数をクリックして編集
- **Initial value**: 話題B用のwxOエージェントID（UUID形式）を入力
- 「Save」をクリック

#### 4-2. 話題A の設定

1. 左メニュー「Actions」＞「All items」＞「Created by you」から「話題A...」のアクションを開く。

2. **Step 3「トークン取得（Extension）」**（赤色表示）:
   - ステップをクリックして開く
   - 「Edit extension」をクリック
   - **Extension**: `wxo-iam-token` を選択
   - **Operation**: `IAMトークンを取得` を選択
   - **Parameters**:
     - `grant_type`: 既に設定済み（`urn:ibm:params:oauth:grant-type:apikey`）
     - `apikey`: `Session variables` > `IBM Cloud API Key` を選択
   - 「Apply」をクリック

3. **Step 6「メッセージを投げる」**（赤色表示）:
   - ステップをクリックして開く
   - 「Edit extension」をクリック
   - **Extension**: `wxo-agent-access` を選択
   - **Operation**: `エージェントにメッセージを送信` を選択
   - **Parameters**:
     - `Authorization`: `Expression` を選択し、`"Bearer " + ` の後に 
     `$`を入力して現れる`wxo-iam-token (step 3) > `body.access_token` を選択、「Apply」をクリック
     (注意: '+' の前後にスペース1文字)     
     - `message_content`: `Session variables` > `input_text` を選択
     - `agent_id`: `Session variables` > `wwxO Agent ID (話題A)` を選択
   - 「Apply」をクリック

4. **Step 9「メッセージ(body)を取得」**（赤色表示）:
   - ステップをクリックして開く
   - 「Edit extension」をクリック
   - **Extension**: `wxo-agent-access` を選択
   - **Operation**: `スレッドからメッセージ履歴を取得` を選択
   - **Parameters**:
     - `thread_id`: `wxo-agent-access (step 6)` > `body.thread_id` を選択
     - `Authorization`: `Expression` を選択し、`"Bearer " + ` の後に 
     `$`を入力して現れる`wxo-iam-token (step 3) > `body.access_token` を選択、「Apply」をクリック 
     (注意: '+' の前後にスペース1文字)   
   - 「Apply」をクリック

5. **開始条件の設定**:
   - フロー先頭の「Customer starts with:」を選択
   - 「Add example phrases」に、話題Aをトリガーする発言例を複数入力
   - 例: "経費精算について", "経費を申請したい", "経費精算の方法"

6. 右上の保存アイコンをクリックして終了

#### 4-3. 話題B の設定

1. 左メニュー「Actions」＞「All items」＞「Created by you」から「話題B...」のアクションを開く。

2. **Step 3「トークン取得（Extension）」**:
   - 話題Aの手順2と同じ設定

3. **Step 6「メッセージを投げる」**:
   - 話題Aの手順3と同じ設定
       - message.content
       - Authorization
   - **重要**: `agent_id` は `Session variables` > `wwxO Agent ID (話題A)` を選択（話題Bのエージェント）

4. **Step 9「メッセージ(body)を取得」**:
   - 話題Aの手順4と同じ設定

5. **開始条件の設定**:
   - 話題B用の発言例を入力
   - 例: "休暇申請について", "休暇を取りたい", "休暇申請の手順"

6. 右上の保存アイコンをクリックして終了

### 6. 動作確認

1. 右下の「Preview」ボタンをクリック。
2. 話題Aの発言例を入力してwxOからの応答を確認。
3. 話題Bの発言例を入力してwxOからの応答を確認。

## セキュリティに関する注意事項

### API Keyの管理

このセットアップでは、Session Variables（`ibm_cloud_api_key`）にIBM Cloud IAM API Keyを保存します。

**重要な運用ルール**:

1. **エクスポートしたAction JSONは絶対にGitHubにコミットしない**
   - wxA UIでエクスポートしたAction JSONには、Session Variablesの`initial_value`として実際のAPI Keyが含まれます
   - リポジトリの`wxa-wxo-slack-action.json`は`initial_value`なしの安全な状態を維持してください

2. **Variables編集画面での注意**
   - Session Variables編集画面の`Initial value`欄には、生のAPI Keyが表示されます
   - 画面共有やスクリーンショット撮影時は注意してください

3. **API Keyのローテーション**
   - 定期的なAPI Keyの更新を推奨します
   - 漏洩の疑いがある場合は、すぐにAPI Keyを無効化して新規作成してください

以上の設定で、watsonx AssistantとwxOの連携が完了します。