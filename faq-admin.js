// =====================================================================
//  FAQ管理 — ロジック本体（miwa_faq_demo の管理画面を流用）
//  既存の知識ベースCRUD / 未回答対応 / 資料からAI一括取り込み（重複判定）
//  / GAS経由のAI呼び出し をそのまま移植。スタッフ用FAQチャットは含めない。
//  暫定で localStorage に永続化（第2段階のスプレッドシート化までのブリッジ）。
// =====================================================================

// ═══════════════════════════════════════════════
//  ★設定：GASプロキシのURL（APIキーはGAS側で秘匿）
// ═══════════════════════════════════════════════
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwgjgqVJNFNnNwNyzc8DsskESrfvoSSTgpK6T2twFPTVyDrhnR2NhNy_CLiajfB1pC_OA/exec';

// ═══════════════════════════════════════════════
//  データストア（暫定：localStorage。後日スプレッドシート化）
// ═══════════════════════════════════════════════
const FAQ_LS_KEY = 'miwa.faq.kb.v1';

const FAQ_KB_SEED = [
  { id: 1, q: "高級ダウンの素材確認方法", a: "タグの素材表示を必ず確認してください。「ダウン80%以上」かつ「表地：ナイロン・ポリエステル製」であれば高級ダウン扱いとなります。ブランドタグ（モンクレール・タトラス等）がある場合は受付時に専用袋に入れて識別してください。", category: "素材確認", source: "社内マニュアル", addedAt: "2026-06-01" },
  { id: 2, q: "シミ抜きの追加料金はいくらか", a: "シミ抜きは基本料金にプラスして1箇所あたり550円（税込）です。広範囲（手のひらサイズ以上）は1,100円になります。受付時にお客様に必ず説明し了承を得てください。", category: "料金", source: "料金表2026年版", addedAt: "2026-06-01" },
  { id: 3, q: "集配の締め切り時間", a: "集配の受付締め切りは午前10時です。10時以降の受付分は翌日の集配便となります。ドライバーの出発は11時のため、10時〜11時の間に受けた分は翌日扱いで対応してください。", category: "集配", source: "運用ルール", addedAt: "2026-06-01" },
  { id: 4, q: "毛皮・レザーの取扱い可否", a: "【知識】\n- 本毛皮（ミンク・フォックス等）は工場での対応不可\n- フェイクファーは通常クリーニングで対応可能\n- レザー（本革）は専門業者への外注\n【対応手順】\n- 本毛皮は受付しない\n- レザーは外注となり、仕上がりまで3〜4週間かかる旨をお伝えする\n【ベスト提案】\n- レザーは納期に余裕をもって早めのお預けをおすすめする", category: "素材確認", source: "社内マニュアル", addedAt: "2026-06-01" },
  { id: 5, q: "仕上がり日数の目安", a: "通常品は3〜5営業日が目安です。繁忙期（12〜1月・3〜4月）は5〜7営業日になることがあります。特急（翌日仕上げ）は別途特急料金が発生します。受付時に必ずお伝えください。", category: "受付", source: "社内マニュアル", addedAt: "2026-06-01" },
  { id: 6, q: "高級ダウンの判断基準", a: "【知識】\n以下のいずれかに該当する場合、高級ダウン扱いとします。\n- ブランド品：モンクレール、タトラス、カナダグース、デュベティカ、ヘルノなどの高級ブランド\n- ダウン率80%以上かつ販売価格が概ね5万円以上と思われるもの\n- お客様自身が「高級品として扱ってほしい」と申告されたもの\n【対応手順】\n- 通常品と区別して専用袋に入れる\n- 判断に迷う場合は店長または工場（八潮）に確認する\n【ベスト提案】\n- 高級ダウン専用コースをご案内する\n- 撥水加工の追加をおすすめする（保温性・防汚の観点）", category: "素材確認", source: "社内マニュアル", addedAt: "2026-06-10" },
  { id: 7, q: "ケアラベル（品質表示）の必須項目は", a: "ケアラベルには次の4項目の表示が義務付けられています。\n- 繊維の組成（例：綿100%）\n- はっ水性（はっ水加工の有無。永久的ではない旨も記載）\n- 家庭洗濯等の取り扱い方法\n- 表示者名及び連絡先\n並行輸入品（海外製品）にも必ず日本語で表示する義務があります。ただしマフラー・水着・靴下などは表示が不要な場合もあります。", category: "表示・ケアラベル", source: "研修資料（シミ抜き接客応対）", addedAt: "2026-06-10" },
  { id: 8, q: "手洗いコースと手洗い表示は同じか", a: "違います。洗濯機の「手洗いコース」「ドライコース」は、機械力を標準より弱くしてはいますが、結果的に機械の力を使って洗う方法です。水による縮みや風合い変化からデリケートな衣類を守る目的のもので、洗濯表示の「手洗い」とは異なります。", category: "洗濯表示", source: "研修資料（シミ抜き接客応対）", addedAt: "2026-06-10" },
  { id: 9, q: "シミ・汚れの付いた衣類を受付するときのポイント", a: "次の4ステップで対応します。項目がひとつ欠けると全く違った接客になります。\n1. 見た目で判断（検品・現状把握）：撥水加工、不溶性・合皮・本革・デニムなどを確認\n2. お客様に聞いてみる（事情聴取）：いつ何が付いたか／何か処理をしたか／状態は変化したか\n3. どんなお手伝いができるか（提案）：汗抜き、部分シミ抜き、部位漂白、全体漂白、特殊洗浄など\n4. 今後のアドバイス：シミ抜き困難な素材、シワ加工・プリーツなどには一言アドバイスを添える", category: "接客・受付", source: "研修資料（シミ抜き接客応対）", addedAt: "2026-06-10" },
  { id: 10, q: "検品のときに注意すること", a: "風合いやニオイの確認に加え、日焼け・退色の可能性、キズ・スレにも注意します。撥水加工の有無や、不溶性・合皮・本革・デニムといった素材かどうかも見ます。気になる点はお客様への事情聴取につなげます。", category: "接客・受付", source: "研修資料（シミ抜き接客応対）", addedAt: "2026-06-10" },
  { id: 11, q: "お客様がクリーニングに求めていること", a: "「洋服をキレイにしてほしい」＋「なるべく安い方法で」の両方です。洋服がキレイになることを前提に、最もお得な提案をすることが大切です。お客様は提案を待っています。", category: "接客・心構え", source: "研修資料（シミ抜き接客応対）", addedAt: "2026-06-10" },
  { id: 12, q: "シミ抜きとは（定義）", a: "シミ抜きとは、通常のクリーニングでは落としきれないものを、特殊な薬品を用いて処理することです。", category: "シミ抜き知識", source: "研修資料（シミ抜き接客応対）", addedAt: "2026-06-10" },
  { id: 13, q: "シミの種類にはどんなものがあるか", a: "シミは主に8種類に分類されます。\n- 油溶性：油ジミ、マニキュア、口紅 など\n- 水油性：花粉 など\n- 水溶性：飲料、ヤニ、調味料 など\n- たんぱく質：血液、乳製品 など\n- 色素：ボールペン、水性・油性マジック、ワイン など\n- 不溶性：ボールペン（カーボン）、泥、墨汁、歯磨き粉 など\n- 変色：サビ、黄ばみ、汗ジミ など\n- 変色Ⅱ：やけ、ガス変色、退色 など", category: "シミ抜き知識", source: "研修資料（シミ抜き接客応対）", addedAt: "2026-06-10" },
  { id: 14, q: "シルクのシミ抜きは難しいのか", a: "【知識】\n難しいです。シミ抜きの多くは温度を上げて処理しますが、シルクは30℃くらいが限度です。染色の際の温度が低いため色が出やすく、その分シミ抜きが困難になります。単色なら修整できるものもありますが、柄や異色使いは修整が不可です。\n【対応手順】\n- 柄物・異色使いかどうかを確認する\n- 完全に落とせない可能性・色泣きのリスクを受付時にお客様へ説明する\n- 判断に迷う場合は工場に確認する\n【ベスト提案】\n- リスクを説明したうえで部分シミ抜きを提案する\n- 無理な処理は避け、目立たなくする方向での仕上げも選択肢として案内する", category: "シミ抜き知識・素材", source: "研修資料（シミ抜き接客応対）", addedAt: "2026-06-10" },
  { id: 15, q: "金糸はシミ抜きできるか", a: "基本的にできません（×）。金糸は最近は主にアルミニウムですが、少し前までは銅糸・鉄糸が使われていました。銅や鉄の糸は酸素系漂白で錆びて変色します。アルミニウムは糸に蒸着させていて薄いため、漂白でなくなる可能性があります。ステンレスはシミ抜き可能ですが肉眼で判別できないため、基本的に危険です。変色・脆化の原因になります。", category: "シミ抜き知識・素材", source: "研修資料（シミ抜き接客応対）", addedAt: "2026-06-10" },
  { id: 16, q: "酸素系漂白とは", a: "繊維に大量の酸素を与えて酸化させ、シミを取る方法です。", category: "シミ抜き知識", source: "研修資料（シミ抜き接客応対）", addedAt: "2026-06-10" }
];

let knowledgeBase = [];
let unansweredList = [];
let historyLog = [];
let nextId = 100;
let statsAnswered = 0;

// ─── 永続化 ───
function persistFaq() {
  try {
    localStorage.setItem(FAQ_LS_KEY, JSON.stringify({
      knowledgeBase, unansweredList, nextId, statsAnswered
    }));
  } catch (e) {}
}
function loadFaq() {
  let loaded = null;
  try { const s = localStorage.getItem(FAQ_LS_KEY); if (s) loaded = JSON.parse(s); } catch (e) {}
  if (loaded && Array.isArray(loaded.knowledgeBase)) {
    knowledgeBase = loaded.knowledgeBase;
    unansweredList = Array.isArray(loaded.unansweredList) ? loaded.unansweredList : [];
    nextId = typeof loaded.nextId === 'number' ? loaded.nextId : 100;
    statsAnswered = typeof loaded.statsAnswered === 'number' ? loaded.statsAnswered : 0;
  } else {
    // 初回：シードを複製して採用
    knowledgeBase = JSON.parse(JSON.stringify(FAQ_KB_SEED));
    unansweredList = [];
    nextId = 100;
    statsAnswered = 0;
  }
}

// ═══════════════════════════════════════════════
//  AI呼び出し（生テキストを返す共通関数。GAS経由）
// ═══════════════════════════════════════════════
async function callAIRaw(systemPrompt, userContent, maxTokens) {
  const useGas = GAS_URL && GAS_URL.trim() !== '';
  const endpoint = useGas ? GAS_URL : 'https://api.anthropic.com/v1/messages';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': useGas ? 'text/plain;charset=utf-8' : 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: maxTokens || 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }]
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || err.error || `API Error ${response.status}`);
  }
  const data = await response.json();
  if (data.error) throw new Error(typeof data.error === 'string' ? data.error : (data.error.message || 'APIエラー'));
  return data.content?.find(c => c.type === 'text')?.text || '';
}

// ═══════════════════════════════════════════════
//  未回答リスト
// ═══════════════════════════════════════════════
function renderUnanswered() {
  const list = document.getElementById('ua-list');
  const badge = document.getElementById('ua-badge');
  if (!list) return;
  const pending = unansweredList.filter(u => !u.answered);

  if (unansweredList.length === 0) {
    list.innerHTML = '<div class="kb-empty">未回答の質問はありません ✨</div>';
    if (badge) badge.style.display = 'none';
    return;
  }

  if (badge) {
    badge.textContent = pending.length;
    badge.style.display = pending.length > 0 ? 'inline-flex' : 'none';
  }

  list.innerHTML = unansweredList.map(item => `
    <div class="ua-item ${item.answered ? 'ua-answered' : ''}" id="ua-${item.id}">
      <div class="ua-item-head">
        <div class="ua-item-info">
          <div class="ua-item-q">${escHtml(item.q)}</div>
          <div class="ua-item-meta">${item.addedAt}${item.answered ? ' · ✅ 回答済み・知識化済み' : ''}</div>
        </div>
        ${!item.answered ? `<button class="btn btn-sm btn-success" onclick="toggleUAForm(${item.id})">回答して知識化</button>` : ''}
      </div>
      <div class="ua-answer-form" id="ua-form-${item.id}">
        <label style="font-size:12px;font-weight:600;color:var(--success)">回答内容</label>
        <textarea class="form-textarea" id="ua-a-${item.id}" placeholder="この質問への正しい回答を入力..."></textarea>
        <label style="font-size:12px;font-weight:600;color:var(--success)">カテゴリ（任意）</label>
        <input class="form-input" id="ua-cat-${item.id}" placeholder="例：受付・料金・素材確認">
        <label style="font-size:12px;font-weight:600;color:var(--success)">参考画像URL（任意・最大5枚・改行かカンマ区切り）</label>
        <textarea class="form-textarea" id="ua-img-${item.id}" placeholder="https://..." style="min-height:48px"></textarea>
        <div class="form-row">
          <button class="btn btn-success btn-sm" onclick="approveAnswer(${item.id})">✅ 知識ベースに追加</button>
          <button class="btn btn-outline btn-sm" onclick="toggleUAForm(${item.id})">キャンセル</button>
        </div>
      </div>
    </div>
  `).join('');
}

function toggleUAForm(id) {
  const form = document.getElementById(`ua-form-${id}`);
  if (form) form.classList.toggle('open');
}

function approveAnswer(id) {
  const item = unansweredList.find(u => u.id === id);
  if (!item) return;
  const a = document.getElementById(`ua-a-${id}`).value.trim();
  const cat = document.getElementById(`ua-cat-${id}`).value.trim();
  const imgs = parseImageUrls(document.getElementById(`ua-img-${id}`).value);
  if (!a) { alert('回答内容を入力してください'); return; }

  knowledgeBase.push({
    id: nextId++, q: item.q, a,
    category: cat || '未分類', source: '未回答リストから追加',
    images: imgs, addedAt: nowStr()
  });

  item.answered = true;
  persistFaq();
  renderUnanswered();
  renderKB();
  updateStats();

  const el = document.getElementById(`ua-${id}`);
  if (el) el.style.background = '#ecfdf5';
}

// 未回答を手動で1件追加（管理画面の手入力用）
function addUnansweredManual() {
  const el = document.getElementById('ua-manual-input');
  const q = (el?.value || '').trim();
  if (!q) return;
  if (unansweredList.find(u => u.q === q)) { alert('同じ質問がすでに未回答リストにあります'); el.value = ''; return; }
  unansweredList.unshift({ id: nextId++, q, addedAt: nowStr(), answered: false });
  el.value = '';
  persistFaq();
  renderUnanswered();
  updateStats();
}

// ═══════════════════════════════════════════════
//  資料から一括取り込み
// ═══════════════════════════════════════════════
let importCandidates = [];

function existingCategories() {
  return [...new Set(knowledgeBase.map(k => k.category).filter(Boolean))];
}

// 質問文ベースの類似既存知識を探す（重複検出用）
function findSimilarKnowledge(question) {
  const q = (question || '').replace(/[？。、！\s]/g, '').toLowerCase();
  if (!q) return null;
  let best = null, bestScore = 0;
  for (const item of knowledgeBase) {
    const qT = item.q.replace(/[？。、！\s]/g, '').toLowerCase();
    let score = 0;
    if (qT.includes(q) || q.includes(qT)) score += 40;
    for (let len = Math.min(q.length, 6); len >= 2; len--) {
      for (let i = 0; i <= q.length - len; i++) {
        if (qT.includes(q.slice(i, i + len))) score += len * 2;
      }
    }
    if (score > bestScore) { bestScore = score; best = item; }
  }
  return bestScore >= 12 ? { item: best, score: bestScore } : null;
}

// 「AIで仕分け」
async function bulkSort() {
  const src = document.getElementById('import-src').value.trim();
  if (!src) { alert('資料テキストを貼り付けてください'); return; }

  const btn = document.getElementById('import-btn');
  const result = document.getElementById('import-result');
  btn.disabled = true;
  btn.textContent = '⏳ 仕分け中...';
  result.innerHTML = '<div style="font-size:13px;color:var(--text-sub)">AIが資料を読んで知識候補に分けています...</div>';

  const cats = existingCategories();
  const systemPrompt = `あなたはクリーニング店「クリーニングみわ」の知識ベース編集アシスタントです。
渡された資料テキストを、社内FAQ用の「知識候補」に分解してください。

【ルール】
- 1つの話題ごとに1件の候補に分ける
- 各候補は次の項目を持つ：
  - question：受付・工場スタッフが実際に聞きそうな質問文
  - knowledge：事実・基準・理由
  - procedure：受付や処理での手順（資料に無ければ空文字 ""）
  - proposal：お客様への提案（資料に無ければ空文字 ""）
  - category：カテゴリ
- categoryは可能な限り既存カテゴリから選ぶ。合うものが無いときだけ新しいカテゴリ名を付ける
- 資料に書かれていないことは創作しない。手順・提案が無ければ空文字にする
- 既存カテゴリ一覧：${cats.join('、') || '（まだ無し）'}

【出力形式】
JSON配列だけを出力する。前置き・説明・コードフェンス(\`\`\`)は一切付けない。
[{"question":"...","knowledge":"...","procedure":"...","proposal":"...","category":"..."}]`;

  try {
    const raw = await callAIRaw(systemPrompt, src, 2500);
    let jsonText = raw.trim();
    const s = jsonText.indexOf('['), e = jsonText.lastIndexOf(']');
    if (s !== -1 && e !== -1) jsonText = jsonText.slice(s, e + 1);
    const arr = JSON.parse(jsonText);

    importCandidates = arr.map((c, i) => {
      const q = c.question || '';
      const dup = findSimilarKnowledge(q);
      return {
        id: 'imp' + i,
        q,
        knowledge: c.knowledge || '',
        procedure: c.procedure || '',
        proposal: c.proposal || '',
        category: c.category || '未分類',
        image: '',
        catMode: cats.includes(c.category) ? 'existing' : (c.category ? 'new' : 'existing'),
        dup,
        decision: dup ? 'overwrite' : 'new'
      };
    });

    renderImport();
  } catch (err) {
    result.innerHTML = `<div class="dup-warn"><div class="dup-warn-title">⚠️ 仕分けに失敗しました</div>
      <div>${escHtml(err.message)}</div>
      <div style="margin-top:6px;color:var(--text-muted)">AIの応答がJSON形式にならなかった可能性があります。テキストを短くするか、もう一度お試しください。</div></div>`;
  }

  btn.disabled = false;
  btn.textContent = '🪄 AIで仕分け';
}

// 編集中のDOM値を状態へ反映（再描画前に呼ぶ）
function syncImportFromDom() {
  for (const c of importCandidates) {
    const get = (suf) => { const el = document.getElementById(`${suf}-${c.id}`); return el ? el.value : undefined; };
    const q = get('imp-q'); if (q !== undefined) c.q = q;
    const k = get('imp-k'); if (k !== undefined) c.knowledge = k;
    const p = get('imp-p'); if (p !== undefined) c.procedure = p;
    const b = get('imp-b'); if (b !== undefined) c.proposal = b;
    const img = get('imp-img'); if (img !== undefined) c.image = img;
    if (c.catMode === 'new') { const cn = get('imp-catnew'); if (cn !== undefined) c.category = cn; }
    else { const cs = get('imp-cat'); if (cs !== undefined && cs !== '__new__') c.category = cs; }
  }
}

function renderImport() {
  const result = document.getElementById('import-result');
  const active = importCandidates.filter(c => c.decision !== 'discard');
  if (importCandidates.length === 0) { result.innerHTML = ''; return; }

  const cats = existingCategories();

  let html = `<div class="import-summary">
    <span style="color:var(--primary)">✨ ${importCandidates.length}件の知識候補に仕分けしました</span>
    <span style="font-size:12px;color:var(--text-muted);font-weight:400">確認・修正してから追加してください</span>
  </div>`;

  importCandidates.forEach((c, idx) => {
    const discarded = c.decision === 'discard';
    if (discarded) {
      html += `<div class="import-candidate" style="opacity:.55">
        <div class="import-cand-head">
          <span class="import-badge">候補 ${idx + 1}</span>
          <span style="flex:1;font-size:13px;color:var(--text-muted)">🗑 破棄予定：${escHtml(c.q)}</span>
          <button class="btn btn-sm btn-outline" onclick="setDecision('${c.id}','new')">戻す</button>
        </div>
      </div>`;
      return;
    }

    let dupHtml = '';
    if (c.dup) {
      const ex = c.dup.item;
      const exPreview = escHtml((ex.a || '').replace(/【.*?】/g, '').replace(/\n/g, ' ').slice(0, 80));
      dupHtml = `<div class="dup-warn">
        <div class="dup-warn-title">⚠️ 既存の知識と似ています</div>
        <div class="dup-compare">
          <div style="color:var(--text-muted);margin-bottom:2px">既存（旧）：</div>
          <div style="font-weight:600">${escHtml(ex.q)}</div>
          <div style="color:var(--text-sub)">${exPreview}…</div>
          <div style="color:var(--text-muted);font-size:11px;margin-top:3px">追加日: ${escHtml(ex.addedAt || '—')}｜カテゴリ: ${escHtml(ex.category || '—')}</div>
        </div>
        <div style="color:var(--text-sub)">どう扱いますか？</div>
        <div class="dup-actions">
          <button class="${c.decision === 'overwrite' ? 'sel-overwrite' : ''}" onclick="setDecision('${c.id}','overwrite')">↻ 上書き更新（新で置き換え）</button>
          <button class="${c.decision === 'new' ? 'sel-separate' : ''}" onclick="setDecision('${c.id}','new')">＋ 別物として追加</button>
          <button class="${c.decision === 'discard' ? 'sel-discard' : ''}" onclick="setDecision('${c.id}','discard')">🗑 この候補を破棄</button>
        </div>
      </div>`;
    }

    const catOptions = cats.map(cat =>
      `<option value="${escHtml(cat)}" ${c.catMode === 'existing' && c.category === cat ? 'selected' : ''}>${escHtml(cat)}</option>`
    ).join('');
    const catSelect = c.catMode === 'new'
      ? `<input class="form-input" id="imp-catnew-${c.id}" value="${escHtml(c.category)}" placeholder="新しいカテゴリ名">
         <div style="margin-top:3px"><button class="btn btn-sm btn-outline" onclick="setCatMode('${c.id}','existing')">既存から選ぶ</button></div>`
      : `<select class="form-input" id="imp-cat-${c.id}" onchange="onCatChange('${c.id}',this.value)">
           ${catOptions}
           <option value="__new__">＋ 新しいカテゴリ…</option>
         </select>`;

    html += `<div class="import-candidate">
      <div class="import-cand-head">
        <span class="import-badge">候補 ${idx + 1}</span>
        <input class="form-input" id="imp-q-${c.id}" value="${escHtml(c.q)}" style="flex:1;font-weight:600" placeholder="質問文">
        <button class="btn btn-outline import-del" onclick="setDecision('${c.id}','discard')" title="破棄">✕</button>
      </div>
      ${dupHtml}
      <div class="import-field">
        <label class="lbl-k">📘 知識</label>
        <textarea class="form-textarea" id="imp-k-${c.id}" style="min-height:44px">${escHtml(c.knowledge)}</textarea>
      </div>
      <div class="import-field">
        <label class="lbl-p">🛠 対応手順<span style="font-weight:400;color:var(--text-muted)">（無ければ空欄でOK）</span></label>
        <textarea class="form-textarea" id="imp-p-${c.id}" style="min-height:44px">${escHtml(c.procedure)}</textarea>
      </div>
      <div class="import-field">
        <label class="lbl-b">💡 ベスト提案<span style="font-weight:400;color:var(--text-muted)">（無ければ空欄でOK）</span></label>
        <textarea class="form-textarea" id="imp-b-${c.id}" style="min-height:44px">${escHtml(c.proposal)}</textarea>
      </div>
      <div class="import-cat-row">
        <div>
          <label style="font-size:11px;font-weight:600;color:var(--text-sub);display:block;margin-bottom:3px">カテゴリ</label>
          ${catSelect}
        </div>
        <div>
          <label style="font-size:11px;font-weight:600;color:var(--text-sub);display:block;margin-bottom:3px">画像URL（任意）</label>
          <input class="form-input" id="imp-img-${c.id}" value="${escHtml(c.image)}" placeholder="https://...">
        </div>
      </div>
    </div>`;
  });

  html += `<div class="form-row" style="margin-top:6px;align-items:center">
    <button class="btn btn-primary btn-sm" onclick="commitImport()">✅ ${active.length}件を知識ベースに追加</button>
    <button class="btn btn-outline btn-sm" onclick="clearImport()">すべて破棄</button>
    <span style="font-size:12px;color:var(--text-muted);margin-left:4px">追加後はFAQですぐ回答に使われます</span>
  </div>`;

  result.innerHTML = html;
}

function setDecision(id, decision) {
  syncImportFromDom();
  const c = importCandidates.find(x => x.id === id);
  if (c) c.decision = decision;
  renderImport();
}

function onCatChange(id, val) {
  syncImportFromDom();
  const c = importCandidates.find(x => x.id === id);
  if (!c) return;
  if (val === '__new__') { c.catMode = 'new'; c.category = ''; }
  else { c.category = val; }
  renderImport();
}

function setCatMode(id, mode) {
  syncImportFromDom();
  const c = importCandidates.find(x => x.id === id);
  if (c) c.catMode = mode;
  renderImport();
}

function buildAnswerField(c) {
  const parts = [];
  if (c.knowledge && c.knowledge.trim()) parts.push('【知識】\n' + c.knowledge.trim());
  if (c.procedure && c.procedure.trim()) parts.push('【対応手順】\n' + c.procedure.trim());
  if (c.proposal && c.proposal.trim()) parts.push('【ベスト提案】\n' + c.proposal.trim());
  return parts.join('\n');
}

function commitImport() {
  syncImportFromDom();
  const toAdd = importCandidates.filter(c => c.decision !== 'discard');
  if (toAdd.length === 0) { alert('追加する候補がありません'); return; }

  let added = 0, updated = 0;
  for (const c of toAdd) {
    if (!c.q.trim()) continue;
    const a = buildAnswerField(c);
    const imgs = parseImageUrls(c.image);

    if (c.decision === 'overwrite' && c.dup) {
      const target = knowledgeBase.find(k => k.id === c.dup.item.id);
      if (target) {
        target.q = c.q.trim();
        target.a = a;
        target.category = c.category || '未分類';
        if (imgs.length) target.images = imgs;
        target.source = '一括取り込み（更新）';
        target.addedAt = nowStr();
        updated++;
        continue;
      }
    }
    knowledgeBase.push({
      id: nextId++, q: c.q.trim(), a,
      category: c.category || '未分類', source: '一括取り込み',
      images: imgs, addedAt: nowStr()
    });
    added++;
  }

  importCandidates = [];
  document.getElementById('import-src').value = '';
  document.getElementById('import-result').innerHTML =
    `<div class="dup-warn" style="background:var(--success-light);border-color:#a7f3d0">
      <div class="dup-warn-title" style="color:var(--success)">✅ 取り込み完了</div>
      <div>新規追加 ${added}件${updated ? ` ／ 上書き更新 ${updated}件` : ''} を知識ベースに反映しました。</div>
    </div>`;
  persistFaq();
  renderKB();
  updateStats();
}

function clearImport() {
  importCandidates = [];
  document.getElementById('import-src').value = '';
  document.getElementById('import-result').innerHTML = '';
}

// ═══════════════════════════════════════════════
//  知識ベース管理
// ═══════════════════════════════════════════════
function renderKB() {
  const list = document.getElementById('kb-list');
  if (!list) return;
  const searchVal = document.getElementById('kb-search')?.value.toLowerCase() || '';
  const items = knowledgeBase.filter(item =>
    !searchVal ||
    item.q.toLowerCase().includes(searchVal) ||
    item.a.toLowerCase().includes(searchVal) ||
    (item.category || '').toLowerCase().includes(searchVal)
  );

  if (items.length === 0) {
    list.innerHTML = '<div class="kb-empty">該当する知識がありません</div>';
    return;
  }

  list.innerHTML = items.map(item => `
    <div class="kb-item">
      <div class="kb-item-head" onclick="toggleKB(${item.id})">
        <div class="kb-item-q">
          <span class="kb-tag">${escHtml(item.category || '未分類')}</span>
          ${escHtml(item.q)}
        </div>
        <span style="color:var(--text-muted);font-size:12px">▼</span>
      </div>
      <div class="kb-item-body" id="kb-body-${item.id}">
        ${mdToHtml(item.a)}
        ${imagesHtml([item])}
        <div class="kb-item-source">出典: ${escHtml(item.source || '—')} | 追加日: ${escHtml(item.addedAt || '—')}${(item.images||[]).length ? ` | 🖼 画像${item.images.length}枚` : ''}</div>
        <div style="margin-top:10px">
          <button class="btn btn-sm btn-outline" onclick="deleteKB(${item.id})">🗑 削除</button>
        </div>
      </div>
    </div>
  `).join('');
}

function toggleKB(id) {
  const body = document.getElementById(`kb-body-${id}`);
  if (body) body.classList.toggle('open');
}

function deleteKB(id) {
  if (!confirm('この知識を削除しますか？')) return;
  knowledgeBase = knowledgeBase.filter(k => k.id !== id);
  persistFaq();
  renderKB();
  updateStats();
}

let addFormOpen = false;
function toggleAddForm() {
  addFormOpen = !addFormOpen;
  document.getElementById('add-form-wrap').style.display = addFormOpen ? 'block' : 'none';
}

function addKB() {
  const q = document.getElementById('new-q').value.trim();
  const a = document.getElementById('new-a').value.trim();
  const cat = document.getElementById('new-cat').value.trim();
  const src = document.getElementById('new-src').value.trim();
  const imgs = parseImageUrls(document.getElementById('new-img').value);
  if (!q || !a) { alert('質問と回答は必須です'); return; }

  knowledgeBase.push({
    id: nextId++, q, a,
    category: cat || '未分類', source: src || '手動追加',
    images: imgs, addedAt: nowStr()
  });

  document.getElementById('new-q').value = '';
  document.getElementById('new-a').value = '';
  document.getElementById('new-cat').value = '';
  document.getElementById('new-src').value = '';
  document.getElementById('new-img').value = '';
  toggleAddForm();
  persistFaq();
  renderKB();
  updateStats();
}

// ═══════════════════════════════════════════════
//  質問ログ（全端末の質問・回答の記録）
//  ・全端末共有は GAS+スプレッドシート（第3段階）が必要。
//    GASに getFaqLog アクションを実装すると「全端末から取得」で一覧表示される。
//  ・GAS契約：POST {action:'getFaqLog'} → { ok:true, logs:[{q,a,answered,store,device,ts}] }
//    （ts は ISO文字列 or 表示用文字列。新しい順で返す想定）
//  ・スタッフFAQ側は質問のたびに POST {action:'logFaq', entry:{q,a,answered,store,device,ts}}
//    を送る（第3段階で実装）。同一端末ぶんは下の MiwaFaqLog.append でも記録できる。
// ═══════════════════════════════════════════════
const FAQ_LOG_KEY = 'miwa.faq.log.v1';
let faqLog = [];
let faqLogFilter = 'all';     // all | answered | unanswered
let faqLogSource = 'local';   // local | gas
let faqLogSearch = '';

function loadLocalLog() {
  try { const s = localStorage.getItem(FAQ_LOG_KEY); const a = s ? JSON.parse(s) : []; return Array.isArray(a) ? a : []; }
  catch (e) { return []; }
}

function logTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return String(ts);
  return d.toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function setFaqLogFilter(f) { faqLogFilter = f; renderFaqLog(); }

function onFaqLogSearch(v) { faqLogSearch = (v || '').toLowerCase(); renderFaqLog(); }

function renderFaqLog() {
  const list = document.getElementById('faqlog-list');
  if (!list) return;

  // フィルタチップの選択状態
  document.querySelectorAll('#faqlog-filters .log-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.f === faqLogFilter);
  });

  // ソース表示
  const src = document.getElementById('faqlog-source');
  if (src) {
    src.textContent = faqLogSource === 'gas'
      ? '🟢 全端末（スプレッドシート）'
      : 'この端末の記録のみ';
  }

  let rows = faqLog.slice();
  if (faqLogFilter === 'answered') rows = rows.filter(r => r.answered);
  else if (faqLogFilter === 'unanswered') rows = rows.filter(r => !r.answered);
  if (faqLogSearch) {
    rows = rows.filter(r =>
      String(r.q || '').toLowerCase().includes(faqLogSearch) ||
      String(r.a || '').toLowerCase().includes(faqLogSearch) ||
      String(r.store || '').toLowerCase().includes(faqLogSearch)
    );
  }

  const count = document.getElementById('faqlog-count');
  if (count) count.textContent = `${rows.length}件`;

  if (faqLog.length === 0) {
    list.innerHTML = `<div class="kb-empty" style="line-height:1.8">まだ記録がありません。<br>
      <span style="font-size:12px;color:var(--text-muted)">スタッフFAQでの質問が、全端末共有のログ保存（第3段階）に対応すると、ここに自動で一覧表示されます。<br>
      「🔄 全端末から取得」を押すとスプレッドシートのログを読み込みます。</span></div>`;
    return;
  }
  if (rows.length === 0) { list.innerHTML = '<div class="kb-empty">該当する記録がありません</div>'; return; }

  list.innerHTML = rows.map((r, i) => {
    const ans = !!r.answered;
    const aPreview = escHtml(String(r.a || '').replace(/【.*?】/g, '').replace(/\n+/g, ' ').slice(0, 90));
    return `<div class="log-row ${ans ? '' : 'log-unanswered'}">
      <div class="log-row-top">
        <span class="log-status ${ans ? 'ok' : 'ng'}">${ans ? '回答済み' : '未回答'}</span>
        ${r.store ? `<span class="log-store">${escHtml(r.store)}</span>` : ''}
        <span class="log-time">${logTime(r.ts)}</span>
      </div>
      <div class="log-q">${escHtml(r.q || '')}</div>
      ${r.a ? `<div class="log-a" onclick="this.classList.toggle('open')"><span class="log-a-label">AI回答</span> ${aPreview}${String(r.a||'').length > 90 ? '…' : ''}
        <div class="log-a-full">${mdToHtml(r.a)}</div></div>` : ''}
    </div>`;
  }).join('');
}

async function refreshFaqLogRemote() {
  const btn = document.getElementById('faqlog-refresh');
  const old = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = '⏳ 取得中...'; }
  let okRemote = false;
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'getFaqLog',
        idToken: (window.MiwaAuth && window.MiwaAuth.idToken && window.MiwaAuth.idToken()) || ''
      })
    }).then(r => r.json()).catch(() => null);
    if (res && res.ok && Array.isArray(res.logs)) {
      faqLog = res.logs;
      faqLogSource = 'gas';
      okRemote = true;
    }
  } catch (e) {}

  if (btn) { btn.disabled = false; btn.textContent = old; }

  if (!okRemote) {
    faqLog = loadLocalLog();
    faqLogSource = 'local';
    const note = document.getElementById('faqlog-note');
    if (note) {
      note.textContent = 'まだ全端末ログを取得できません（GAS側のログ保存／getFaqLog が未実装です。第3段階で対応）。現在はこの端末の記録のみ表示しています。';
      note.style.display = 'block';
    }
  } else {
    const note = document.getElementById('faqlog-note');
    if (note) note.style.display = 'none';
  }
  renderFaqLog();
}

// 同一端末でスタッフFAQが質問するたびに呼べる記録API（任意・将来用）
window.MiwaFaqLog = {
  append(entry) {
    try {
      const arr = loadLocalLog();
      arr.unshift(Object.assign({ ts: new Date().toISOString() }, entry || {}));
      localStorage.setItem(FAQ_LOG_KEY, JSON.stringify(arr.slice(0, 500)));
    } catch (e) {}
  },
  all() { return loadLocalLog(); }
};

// ═══════════════════════════════════════════════
//  統計
// ═══════════════════════════════════════════════
function updateStats() {
  const k = document.getElementById('stat-kb');
  const a = document.getElementById('stat-answered');
  const u = document.getElementById('stat-unanswered');
  if (k) k.textContent = knowledgeBase.length;
  if (a) a.textContent = statsAnswered;
  if (u) u.textContent = unansweredList.filter(x => !x.answered).length;
}

// ═══════════════════════════════════════════════
//  ユーティリティ
// ═══════════════════════════════════════════════
function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function mdToHtml(s) {
  const escaped = escHtml(s);
  const lines = escaped.split('\n');
  let html = '';
  let inList = false;
  const closeList = () => { if (inList) { html += '</ul>'; inList = false; } };

  const sectionStyle = {
    '知識': { color: '#2563eb', icon: '📘' },
    '対応手順': { color: '#d97706', icon: '🛠' },
    'ベスト提案': { color: '#059669', icon: '💡' }
  };

  for (const line of lines) {
    const t = line.trim();
    const head = t.match(/^【(.+?)】(.*)$/);
    if (head) {
      closeList();
      const label = head[1];
      const st = sectionStyle[label] || { color: 'var(--text-sub)', icon: '' };
      html += `<div style="font-weight:700;font-size:12px;color:${st.color};margin:10px 0 4px;letter-spacing:.03em">${st.icon} ${label}</div>`;
      if (head[2].trim()) html += `<div>${head[2].trim()}</div>`;
    } else if (t.startsWith('- ') || t.startsWith('・')) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${t.replace(/^(- |・)/, '')}</li>`;
    } else {
      closeList();
      if (t) html += `<div>${t}</div>`;
    }
  }
  closeList();
  return html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function imagesHtml(items) {
  const urls = [];
  for (const item of (items || [])) {
    for (const url of (item.images || [])) {
      if (url && !urls.includes(url)) urls.push(url);
    }
  }
  if (urls.length === 0) return '';
  return `<div class="answer-images">${
    urls.slice(0, 5).map(u =>
      `<img src="${escHtml(u)}" alt="参考画像" onclick="window.open('${escHtml(u)}','_blank')" onerror="this.style.display='none'">`
    ).join('')
  }</div>`;
}

function parseImageUrls(text) {
  return (text || '')
    .split(/[\n,]/)
    .map(s => s.trim())
    .filter(s => s.startsWith('http'))
    .slice(0, 5);
}

function nowStr() {
  return new Date().toLocaleDateString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

// ═══════════════════════════════════════════════
//  文字サイズ設定（スタッフFAQチャットの表示サイズ）
// ═══════════════════════════════════════════════
function setChatFontSize(px) {
  document.documentElement.style.setProperty('--chat-fs', px + 'px');
  try { localStorage.setItem('miwa_chat_fs', String(px)); } catch (e) {}
  const btns = document.querySelectorAll('.fs-btn');
  btns.forEach(b => b.classList.toggle('active', Number(b.dataset.fs) === px));
}

// ═══════════════════════════════════════════════
//  料金マスキングトグル
// ═══════════════════════════════════════════════
const PRICE_MASK_KEY = 'miwa_price_mask';
function applyPriceMaskUI(enabled) {
  const wrap = document.getElementById('price-mask-toggle');
  const lbl  = document.getElementById('price-mask-label');
  if (!wrap || !lbl) return;
  wrap.style.background = enabled ? 'var(--primary, #1a8f5c)' : 'var(--border)';
  wrap.querySelector('.toggle-knob').style.transform = enabled ? 'translateX(20px)' : 'translateX(0)';
  lbl.textContent = enabled ? 'ON（料金をマスクして「💴 料金表参照」表示）' : 'OFF（料金をそのまま表示）';
}
function togglePriceMask() {
  const cur = localStorage.getItem(PRICE_MASK_KEY) === '1';
  const next = !cur;
  try { localStorage.setItem(PRICE_MASK_KEY, next ? '1' : '0'); } catch (e) {}
  applyPriceMaskUI(next);
}
function initChatFontSize() {
  let px = 15;
  try { const s = localStorage.getItem('miwa_chat_fs'); if (s) px = Number(s); } catch (e) {}
  setChatFontSize(px);
}

// ═══════════════════════════════════════════════
//  管理画面マークアップ（miwa_faq_demo の #tab-admin を移植）
// ═══════════════════════════════════════════════
const FAQ_ADMIN_MARKUP = `
  <div class="stats-bar">
    <div class="stat-card">
      <div class="stat-num" id="stat-kb">0</div>
      <div class="stat-label">登録済み知識</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" id="stat-answered">0</div>
      <div class="stat-label">回答できた質問</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" id="stat-unanswered">0</div>
      <div class="stat-label">未回答（確認待ち）</div>
    </div>
  </div>

  <!-- 質問ログ -->
  <div class="card" style="margin-bottom:16px">
    <div class="card-head">
      <span>🗒</span>
      <h2>質問ログ</h2>
      <span id="faqlog-count" class="log-count">0件</span>
      <span style="flex:1"></span>
      <span id="faqlog-source" style="font-size:12px;color:var(--text-muted)">この端末の記録のみ</span>
      <button class="btn btn-outline btn-sm" id="faqlog-refresh" onclick="refreshFaqLogRemote()" style="margin-left:8px">🔄 全端末から取得</button>
    </div>
    <div class="card-body">
      <p style="font-size:13px;color:var(--text-sub);margin-bottom:10px">スタッフFAQに届いた質問と、AIがどう回答したかの記録です。未回答（答えが無かった質問）はここで把握し、上の未回答リスト／知識ベースに反映できます。</p>
      <div id="faqlog-note" style="display:none;background:var(--warn-light);border:1px solid #fde68a;border-radius:8px;padding:9px 12px;font-size:12px;color:var(--warn);margin-bottom:10px"></div>
      <div class="log-toolbar">
        <div class="log-chips" id="faqlog-filters">
          <button class="log-chip active" data-f="all" onclick="setFaqLogFilter('all')">すべて</button>
          <button class="log-chip" data-f="answered" onclick="setFaqLogFilter('answered')">回答済み</button>
          <button class="log-chip" data-f="unanswered" onclick="setFaqLogFilter('unanswered')">未回答</button>
        </div>
        <input class="form-input" id="faqlog-search" placeholder="🔍 質問・回答・拠点で検索" oninput="onFaqLogSearch(this.value)" style="flex:1;min-width:160px">
      </div>
      <div class="log-list" id="faqlog-list">
        <div class="kb-empty">まだ記録がありません</div>
      </div>
    </div>
  </div>

  <!-- 未回答リスト -->
  <div class="card" style="margin-bottom:16px">
    <div class="card-head">
      <span>🔶</span>
      <h2>未回答リスト</h2>
      <span id="ua-badge" class="badge" style="margin-left:4px;display:none">0</span>
      <span style="flex:1"></span>
      <span style="font-size:12px;color:var(--text-muted)">回答を入力すると知識ベースに追加されます</span>
    </div>
    <div class="card-body">
      <div class="form-row" style="margin-bottom:12px">
        <input class="form-input" id="ua-manual-input" placeholder="未回答として手動で記録する質問（任意）" style="flex:1">
        <button class="btn btn-outline btn-sm" onclick="addUnansweredManual()">＋ 記録</button>
      </div>
      <div class="unanswered-list" id="ua-list">
        <div class="kb-empty">未回答の質問はありません ✨</div>
      </div>
    </div>
  </div>

  <!-- 資料から一括取り込み -->
  <div class="card" style="margin-bottom:16px">
    <div class="card-head">
      <span>📥</span>
      <h2>資料から一括取り込み</h2>
      <span style="flex:1"></span>
      <span style="font-size:12px;color:var(--text-muted)">AIが仕分け→確認して追加</span>
    </div>
    <div class="card-body">
      <p style="font-size:13px;color:var(--text-sub);margin-bottom:10px">マニュアルやメモを貼り付けて「AIで仕分け」を押すと、知識候補に分解します。確認・修正してから知識ベースに追加してください。</p>
      <textarea class="form-textarea" id="import-src" placeholder="例：毛100%のセーターはネットに入れて洗う。タンブル乾燥不可。裏返して洗うのがおすすめ。乾燥機は避けてスチームでうかしながらアイロン。毛玉は引っぱらず毛玉取り器で…" style="min-height:90px"></textarea>
      <div class="form-row" style="margin-top:10px">
        <button class="btn btn-primary btn-sm" id="import-btn" onclick="bulkSort()">🪄 AIで仕分け</button>
        <button class="btn btn-outline btn-sm" onclick="clearImport()">クリア</button>
      </div>
      <div id="import-result" style="margin-top:16px"></div>
    </div>
  </div>

  <!-- 知識ベース管理 -->
  <div class="card" style="margin-bottom:16px">
    <div class="card-head">
      <span>📚</span>
      <h2>知識ベース</h2>
      <span style="flex:1"></span>
      <button class="btn btn-sm btn-primary" onclick="toggleAddForm()">＋ 追加</button>
    </div>
    <div class="card-body">
      <div id="add-form-wrap" style="display:none">
        <div class="kb-add-form">
          <label>質問・キーワード</label>
          <input class="form-input" id="new-q" placeholder="例：高級ダウンの素材確認方法">
          <label>回答内容（【知識】【対応手順】【ベスト提案】の見出しが使えます）</label>
          <textarea class="form-textarea" id="new-a" placeholder="【知識】事実・基準・理由&#10;【対応手順】受付・処理でどう動くか&#10;【ベスト提案】お客様への提案&#10;（観点が無いものは省略可。単純な用語説明は本文だけでOK）"></textarea>
          <label>カテゴリ（任意）</label>
          <input class="form-input" id="new-cat" placeholder="例：受付・素材確認・シミ抜き・料金">
          <label>出典メモ（任意）</label>
          <input class="form-input" id="new-src" placeholder="例：社内マニュアルVer.3">
          <label>参考画像URL（任意・最大5枚・改行かカンマ区切り）</label>
          <textarea class="form-textarea" id="new-img" placeholder="https://... （Googleドライブ共有リンク等）" style="min-height:48px"></textarea>
          <div class="form-row">
            <button class="btn btn-primary btn-sm" onclick="addKB()">登録する</button>
            <button class="btn btn-outline btn-sm" onclick="toggleAddForm()">キャンセル</button>
          </div>
        </div>
      </div>

      <div id="search-kb-wrap" style="margin-bottom:14px">
        <input class="form-input" id="kb-search" placeholder="🔍 知識を検索..." oninput="renderKB()" style="width:100%">
      </div>

      <div class="kb-list" id="kb-list">
        <div class="kb-empty">知識がまだ登録されていません</div>
      </div>
    </div>
  </div>

  <!-- 表示設定 -->
  <div class="card">
    <div class="card-head">
      <span>🔤</span>
      <h2>表示設定</h2>
      <span style="flex:1"></span>
      <span style="font-size:12px;color:var(--text-muted)">スタッフFAQチャットの文字サイズ</span>
    </div>
    <div class="card-body">
      <div class="fs-options" id="fs-options">
        <button class="fs-btn" data-fs="14" onclick="setChatFontSize(14)">小</button>
        <button class="fs-btn" data-fs="15" onclick="setChatFontSize(15)">標準</button>
        <button class="fs-btn" data-fs="17" onclick="setChatFontSize(17)">大</button>
        <button class="fs-btn" data-fs="19" onclick="setChatFontSize(19)">特大</button>
      </div>
      <div class="fs-preview">
        <div class="fs-preview-bubble">あ、こんにちは！文字サイズの見え方はこのくらいです。</div>
      </div>

      <div style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px;">
        <div style="font-size:13px;font-weight:700;margin-bottom:8px;color:var(--text)">💴 料金マスキング</div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;line-height:1.6;">
          ONにすると、知識ベースの回答に含まれる金額（¥〇〇・〇〇円）を<b>「💴 料金表参照」</b>に置き換えます。<br>
          料金表スプレッドシートに移行済みの場合にONにしてください。
        </div>
        <label style="display:flex;align-items:center;gap:12px;cursor:pointer;">
          <div class="toggle-wrap" id="price-mask-toggle" onclick="togglePriceMask()" style="
            width:44px;height:24px;border-radius:12px;background:var(--border);
            position:relative;transition:background .2s;cursor:pointer;flex-shrink:0;">
            <div class="toggle-knob" style="
              position:absolute;top:3px;left:3px;width:18px;height:18px;
              border-radius:50%;background:#fff;transition:transform .2s;
              box-shadow:0 1px 3px rgba(0,0,0,.3);"></div>
          </div>
          <span style="font-size:13px;font-weight:600;" id="price-mask-label">OFF（料金をそのまま表示）</span>
        </label>
      </div>
    </div>
  </div>
`;

// ═══════════════════════════════════════════════
//  初期化
// ═══════════════════════════════════════════════
function initFaqAdmin() {
  loadFaq();
  faqLog = loadLocalLog();
  faqLogSource = 'local';
  updateStats();
  // 料金マスクの初期状態を復元
  try { const v = localStorage.getItem(PRICE_MASK_KEY); if (v !== null) applyPriceMaskUI(v === '1'); } catch (e) {}
  initChatFontSize();
  renderKB();
  renderUnanswered();
  renderFaqLog();
}

// グローバル公開（jsx 側 / inline onclick から参照）
window.FAQ_ADMIN_MARKUP = FAQ_ADMIN_MARKUP;
window.initFaqAdmin = initFaqAdmin;
