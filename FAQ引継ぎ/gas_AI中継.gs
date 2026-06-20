// ═══════════════════════════════════════════════════════════════════
//  クリーニングみわ — Claude AI 中継 GAS
//  Google Apps Script（ウェブアプリとして展開）
// ═══════════════════════════════════════════════════════════════════
//
//  【セットアップ手順】
//  1. このコードをそのままコピーして新しいGASプロジェクトに貼り付ける
//  2. 「プロジェクトの設定」→「スクリプトプロパティ」に2つ追加：
//       ANTHROPIC_API_KEY  → sk-ant-... (Anthropic APIキー)
//       AUTH_TOKEN         → 任意の文字列 (例: miwa2026ai)
//  3. 「デプロイ」→「新しいデプロイ」
//       種類: ウェブアプリ
//       実行ユーザー: 自分
//       アクセスできるユーザー: 全員（匿名を含む）
//  4. 展開URLをfaq-admin.jsの「🤖 AI設定」のURL欄に貼り付ける
//     （AUTH_TOKENもAI設定のトークン欄に入力する）
// ═══════════════════════════════════════════════════════════════════

function getProps_() {
  var props = PropertiesService.getScriptProperties();
  return {
    apiKey:    props.getProperty('ANTHROPIC_API_KEY') || '',
    authToken: props.getProperty('AUTH_TOKEN') || ''
  };
}

function jsonRes_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// GETは疎通確認のみ
function doGet(e) {
  return jsonRes_({ ok: true, message: 'Claude AI中継GAS 稼働中' });
}

// POST: Claudeへ中継
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var p = getProps_();

    // トークン認証
    if (!p.authToken || body.token !== p.authToken) {
      return jsonRes_({ error: 'unauthorized' });
    }

    if (!p.apiKey) {
      return jsonRes_({ error: 'ANTHROPIC_API_KEY が未設定です' });
    }

    // Anthropic Claude APIへ転送
    var payload = {
      model:      body.model      || 'claude-haiku-4-5',
      max_tokens: body.max_tokens || 1500,
      system:     body.system     || '',
      messages:   body.messages   || []
    };

    var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-api-key':         p.apiKey,
        'anthropic-version': '2023-06-01'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    var code = res.getResponseCode();
    var text = res.getContentText();
    var data = JSON.parse(text);

    if (code !== 200) {
      return jsonRes_({ error: data.error || ('APIエラー: ' + code) });
    }

    return jsonRes_(data);

  } catch(err) {
    return jsonRes_({ error: String(err && err.message || err) });
  }
}
