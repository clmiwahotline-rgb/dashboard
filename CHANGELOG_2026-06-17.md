# みわダッシュボード v3.00 — 作業ログ 2026-06-16〜17

## 完了した作業

### 1. 工場報告の読み込みエラー修正
- `polished-mobile-factory.jsx` — 編集モーダル（MFEditModal）のreturn JSXブロックが二重コピーされており、Babel構文エラーで工場報告ビュー全体が読み込めなかった問題を修正。重複ブロック（約120行）を削除。
- `モバイル.html` — v=260 → v=261 に更新

### 2. FAQ スタッフ画面へのリンク修正
- `polished-faq-admin.jsx` / `polished-mobile-faq.jsx` — `FAQ_CHAT_URL` を `"formsite/FAQ.html"` → `"../formsite/FAQ.html"` に修正。ダッシュボードが `dashboard/` サブフォルダに配置されているため相対パスがずれていた。

### 3. PC表示での店舗選択モーダルカード化
- `formsite/FAQ.html` — `showStoreSelect()` をPC幅（601px以上）でモーダルカード表示（半透明バックドロップ＋角丸カード）に変更。従来は全画面幅に広がっていた。ヘッダー・チャットにPC用角丸を追加。

### 4. deploy/ フォルダ廃止・root一本化
- deploy/ フォルダ（109ファイル）を削除。root のファイルを直接 GitHub Desktop でプッシュする運用に変更。
- `v.html` を deploy/ から root に移動。

### 5. FAQ 全端末ログ共有の修正
- `gas/faq-knowledge-base.gs` — `doPost` にトークン認証より前に `logFaq`・`getFaqLog` アクションを追加。従来はトークン認証で `unauthorized` を返していた。
- `faq-admin.js` — `loadCloudCfg()` を改善。localStorage に古い設定（`gasUrl: ''`, `enabled: false`）が残っていても DEFAULT_KB_GAS で上書きされるように。
- `formsite/FAQ.html` — `loadKBFromCloud()` / `sendFaqLogToCloud()` を localStorage 未設定でも DEFAULT_KB_GAS で動作するよう修正。

### 6. FAQ 管理の最新版反映（知識資料ストック・GAS URL修正）
- `faq-admin.js` / `FAQ管理.html` / `polished-faq-admin.jsx` / `faq-admin.css` — FAQ引継ぎフォルダの最新版をrootに適用。知識資料ストック機能・GAS URLを正しく反映。
- `polished-faq-admin.jsx` — `FAQ_CHAT_URL` を `"../formsite/FAQ.html"` に修正（上書きで戻っていたため再修正）。

### 7. 工場報告の編集モーダル表示範囲修正
- `polished-mobile-factory.jsx` — 編集モーダルがヘッダー・タブバーの下に隠れていた問題を修正。`zIndex:200→500`、`paddingTop`にヘッダー高さ、`paddingBottom`にタブバー高さを追加。

### 8. FAQ ファイルアップロード機能実装（Googleドライブ参照）
- `gas/faq-knowledge-base.gs` — `uploadFile_()` 関数・`authorizeDrive()` 関数・`getFile_()` 関数を追加。ファイルを Drive の「FAQ添付ファイル」フォルダに保存し、公開共有URLを返す。
- `faq-admin.js` — 知識追加フォームにファイルアップロードボタン・サムネイルプレビュー・削除ボタンを追加。`uploadFaqFile()`・`faqDriveInfo()`・`renderNewImgPreview()` を実装。
- `FAQ管理.html` — faq-admin.js / faq-admin.css を v=262 に更新。

### 9. PDF アプリ内ビューア（ピンチズーム対応）実装
- `formsite/FAQ.html` — PDF.js（CDN）を追加。PDFタップ時にアプリ内ビューアで開き、2本指ピンチ拡大・ダブルタップ拡大・ホイールズームに対応。「別タブで開く」ボタンも追加。
- Drive 共有リンクの fileId を自動解析し、GAS 経由でバイト取得→PDF.js でレンダリング（Drive に飛ばない）。
- 画像・PDF共通で `faqDriveInfo()` ヘルパーを追加。

### 10. 関連回答サジェスト精度向上
- `formsite/FAQ.html` — `findRelated()` を n-gram（2〜3文字）＋正規化スコア＋カテゴリボーナスに刷新。ノイズ低減・質問文ヒット優先で精度向上。

### 11. 料金表参照パスの修正
- `formsite/FAQ.html` — `../price_seed.js` → `./price_seed.js` に変更。GitHub Pages のリポジトリが `dashboard/` サブフォルダ構成のため `../` が存在しないURLを指していた。
- `formsite/price_seed.js` / `formsite/price_seed_blue.js` — formsite フォルダ内にコピーを配置。

### 12. モバイル版 FAQ 3段階目実装
- `polished-mobile-faq.jsx` — 全面刷新。以下を追加：
  - **知識ベースタブ**：全文検索（キーワード）＋カテゴリチップ絞り込み＋Q&Aカード（タップで展開）
  - **未回答への回答入力**：カードタップで展開→カテゴリ＋回答入力→「回答して知識に追加」→GAS `answer_ua` 送信
  - **質問ログ**：回答済みはタップで回答内容を確認可能
- `モバイル.html` — v=238 → v=263 に更新

### 13. バージョン v3.00 へ更新
- `polished-dashboard.jsx` — `APP_VERSION = "3.00"` に更新
- `manual-data.js` — `version: "v3.00"` に更新
- `v.html` — v3.00 に更新
- `更新レポート.html` — v3.00 エントリを先頭に追加

---

## 残課題・今後の候補

- [ ] 機能説明書を v3.00 に更新（FAQ・PDFビューア・モバイル3段階目の解説を追加）
- [ ] ダッシュボードKPIの実データ反映（現在一部サンプル値）
- [ ] GAS `getFile_` のDrive権限承認（アップロード後に `authorizeDrive` を実行→再デプロイ）
