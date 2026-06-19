# みわダッシュボード — GAS設定バックアップ
> 作成日: 2026-06-19

---

## 1. AI呼び出しGAS（Anthropic Claude 中継）

| 項目 | 値 |
|---|---|
| **GASプロジェクト名** | 社内FAQ（APIプロキシ） |
| **デプロイURL** | `https://script.google.com/macros/s/AKfycbwgjgqVJNFNnNwNyzc8DsskESrfvoSSTgpK6T2twFPTVyDrhnR2NhNy_CLiajfB1pC_OA/exec` |
| **スクリプトプロパティ** | `ANTHROPIC_API_KEY` = Anthropic APIキー（sk-ant-...）<br>`AUTH_TOKEN` = 任意の認証トークン |
| **用途** | 「資料からAI一括取り込み」でClaudeを呼び出す際の中継役 |

### 設定ファイル
| ファイル | 場所 | 内容 |
|---|---|---|
| `faq-admin.js` | 11行目 `GAS_URL = '...'` | AI GAS URLのデフォルト値 |

### 設定方法（ブラウザ上）
1. FAQ管理ページを開く
2. 一番下までスクロール →「🤖 AI設定（一括取り込み用）」カード
3. **AI GAS URL** 欄にデプロイURLを入力（省略するとデフォルトURLを使用）
4. **AI GAS トークン** 欄にAUTH_TOKENの値を入力
5. 「保存」ボタン

### localStorage キー
```
miwa_faq_ai_url   … AI GAS URL（省略時はfaq-admin.jsのGAS_URLを使用）
miwa_faq_ai_token … AUTH_TOKENの値
```

---

## 2. 知識ベースGAS（KB管理・スプレッドシート連携）

| 項目 | 値 |
|---|---|
| **GASプロジェクト名** | faq-knowledge-base |
| **デプロイURL** | `https://script.google.com/macros/s/AKfycbzWq4dsfENPZuZ9eGGum5Glg2pDcLf10bL8dJNvJgr66cgUOHAFGWPJNmkRUl3CpAml/exec` |
| **スクリプトプロパティ** | `AUTH_TOKEN` = 任意の認証トークン（書き込み用） |
| **用途** | 知識ベース・未回答リスト・FAQログをスプレッドシートに保存・全端末共有 |

### 管理シート構成
| シート名 | 内容 |
|---|---|
| 知識ベース | id / q / a / category / source / addedAt / images / enabled |
| 未回答 | id / q / addedAt / status / answeredAt |
| FAQログ | id / ts / q / a / answered / store / device |

### 設定ファイル
| ファイル | 場所 | 内容 |
|---|---|---|
| `faq-admin.js` | 20行目 `DEFAULT_KB_GAS = '...'` | KB GAS URLのデフォルト値 |

### 設定方法（ブラウザ上）
1. FAQ管理ページを開く
2. 下にスクロール →「☁️ Googleスプレッドシート連携」カード
3. **GAS ウェブアプリ URL** 欄にデプロイURLを入力
4. **認証トークン** 欄にAUTH_TOKENの値を入力
5. トグルをONにして「保存して同期」ボタン

### localStorage キー
```
miwa.faq.cloud.v1  … { gasUrl, token, enabled }（KB GAS設定）
miwa.faq.kb.v1     … ローカル知識ベースキャッシュ
```

---

## 3. 共有データGAS（みわダッシュボード全体）

| 項目 | 値 |
|---|---|
| **GASプロジェクト名** | みわダッシュボードデータ |
| **デプロイURL** | `https://script.google.com/macros/s/AKfycbyvBTM4ZijS0hDjKBVjczQywjXYOZJnszLqgqfTZhsNdfd-GSPQp-LYlRxfCMedkg8/exec` |
| **用途** | フィードバック・シフト・車両・FAQ資料など全ページのデータをスプレッドシートで共有 |

### 設定ファイル
| ファイル | 場所 | 内容 |
|---|---|---|
| `polished-cloud.jsx` | 18行目 `CLOUD_API_URL = '...'` | 共有データGAS URL（直接編集） |

### 対応シート（自動作成）
| シート名 | ページ |
|---|---|
| フィードバック | フィードバック報告 |
| 車両 / 給油 / 整備 | 車両管理 |
| FAQ資料 | FAQ管理（知識資料ストック） |
| その他 | 各ページが必要に応じて作成 |

---

## まとめ：GAS一覧

| # | GASプロジェクト | 用途 | 認証方式 |
|---|---|---|---|
| ① | 社内FAQ（APIプロキシ） | Claude AI中継 | `AUTH_TOKEN`（スクリプトプロパティ）|
| ② | faq-knowledge-base | KB・未回答・ログ管理 | `AUTH_TOKEN`（スクリプトプロパティ）|
| ③ | みわダッシュボードデータ | 全ページデータ共有 | なし（全員アクセス可）|

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| 一括取り込み→`unauthorized` | AI GASトークン未設定 | 🤖 AI設定カードでトークンを入力 |
| 知識ベースが他PCに反映されない | KB GAS未設定 or トークン誤り | ☁️ 連携カードで設定確認 |
| 知識資料ストックが消える | 共有データGAS未設定 | `polished-cloud.jsx`のURLを確認 |
| `云 未設定`と表示 | KB GAS URLが空 | ☁️ 連携カードでURLを入力 |
