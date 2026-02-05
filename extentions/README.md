## セットアップ手順

### 1. アシスタントの作成
1. トップメニューから「+新規作成」を選択。
2. **Assistant name**: `wxa-wxo-slack`（任意）
3. **Assistant language**: `Japanese`
4. 「Create assistant」をクリック。

### 2. Actions のインポート
1. 左メニュー「Actions」を選択。
2. 画面右上の歯車アイコン（Global Settings）をクリック。
3. 「Upload/Download」タブを選択。
4. `wxa-wxo-slack-action.json` をアップロード。
5. CloseボタンでActionsメニューに戻る。3つのアクションが登録されていることを確認。

### 3. Extension の登録 (IAM Token)
1. 左メニュー「Integrations」を選択。
2. 「Build custom extension」をクリック。
3. **Basic information**: Nameに `wxo-iam-token` と入力。
4. **Import OpenAPI**: `wxo-iam-token.json` をアップロード。
5. 「Finish」まで進む。
6. Integrations一覧の `wxo-iam-token` の「Add」をクリック。
7. 「Authentication」および「Review operations」をそのまま「Next」で進み「Finish」をクリック。
8. Integrations一覧の `wxo-iam-token` の「Open」をクリック。
9. **Environment**: `Draft` を選択して「Confirm」。
10. 何も変更せず「Save and exit」をクリック。

### 4. Extension の登録 (Agent Access)
1. 左メニュー「Integrations」＞「Build custom extension」をクリック。
2. **Basic information**: Nameに `wxo-agent-access` と入力。
3. **Import OpenAPI**: `wxo-agent-access.json` をアップロード。
4. 「Finish」まで進む。
5. Integrations一覧の `wxo-agent-access` の「Add」をクリック。
6. **Authentication**: 
   - `Server variables` の `instance_id` 等に、wxOの「サービス・インスタンスURL」に含まれるUUID（`00000000-...`）を入力。
7. 「Next」で進み「Finish」をクリック。
8. Integrations一覧の `wxo-agent-access` の「Open」をクリック。
9. **Environment**: `Draft` を選択して「Confirm」。
10. 何も変更せず「Save and exit」をクリック。

### 5. アクションと Extension の紐付け設定
※話題A、話題Bの2つのアクションに対してそれぞれ実施します。
ご注意：Extension定義の各項目はタイミングにより、表示順が異なる場合があります。項目名（Parameters）をよく確認して入力してください。

#### 話題Aの設定
1. 左メニュー「Actions」＞「Created by you」から「話題A...」のアクションを開く。
2. **Step 3「トークン取得」**:
   - 「Edit extension」をクリック。
   - **Extension**: `wxo-iam-token` を選択。
   - **Operation**: `IAMトークンを取得` を選択。
   - **Parameters**: `apikey` に `Enter text` を選択し、IBM Cloud IAM API Keyを入力。
   - 「Apply」をクリック。
3. **Step 6「メッセージを投げる」**:
   - 「Edit extension」をクリック。
   - **Extension**: `wxo-agent-access` を選択。
   - **Operation**: `エージェントにメッセージを送信` を選択。
   - **Parameters**: 
     - `Authorization`: `Expression` を選択し、`"Bearer " + ` の後に `wxo-iam-token(step3) > body.access_token` を挿入。
     - `message_content`: `Assistant variables` > `Session variables` > `input_text` を選択。
     - `agent_id`: `Enter text` を選択し、話題A用の `agentId` を入力。
   - 「Apply」をクリック。
4. **Step 9「メッセージ(body)を取得」**:
   - 「Edit extension」をクリック。
   - **Extension**: `wxo-agent-access` を選択。
   - **Operation**: `スレッドからメッセージ履歴を取得` を選択。
   - **Parameters**:
     - `thread_id`: `wxo-agent-access(step6) > body.thread_id` を選択。
     - `Authorization`: Step 6 と同じ Expression を入力。
   - 「Apply」をクリック。
5. **開始条件の設定**:
   - フロー先頭の「Customer starts with:」を選択。
   - 「Add example phrases」に、話題Aをトリガーする発言例を複数入力。
6. 右上の保存アイコンをクリックして終了。

#### 話題Bの設定
1. 「話題B...」のアクションを開き、上記手順と同様に設定する。
2. **agent_id**: 話題B用の別の `agentId` を入力。
3. **開始条件**: 話題B用の発言例を入力。

### 6. パラメータの置換（重要）
インポートした Actions 内の変数を、ご自身の環境に合わせて書き換えてください。

| 置換対象文字列 | 内容 |
| :--- | :--- |
| `YOUR_IBM_CLOUD_IAM_API_KEY` | IBM Cloud の IAM API キー |
| `YOUR_ORCHESTRATE_AGENT_ID` | 利用する Orchestrate エージェントの ID |