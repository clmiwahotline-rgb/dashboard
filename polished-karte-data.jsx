// カルテ（ハイブランドコース）データ・ユーティリティ
// localStorage: miwa.karte.v1 = カルテ配列（後日クラウド連携予定）

const KARTE_LS_KEY = "miwa.karte.v1";

// 対象拠点（顧客対応を行う9店舗）
const KARTE_STORES = [
  "本店", "新田店", "草加西口店", "モールプラザ草加店", "蒲生店",
  "西友蒲生伊原店", "東川口店", "東川口2号店", "マミーマート川口安行店",
];

const KARTE_CATEGORIES = ["コート・ジャケット", "バッグ", "靴", "財布・小物", "その他"];
const CATEGORY_DIAGRAM = {
  "コート・ジャケット": "garment",
  "バッグ": "bag",
  "靴": "shoes",
  "財布・小物": "bag",
  "その他": "garment",
};

const MEASURE_PRESETS = ["着丈", "身幅", "肩幅", "袖丈", "ウエスト", "裾幅", "高さ", "マチ", "持ち手"];

const CONFIRM_ITEMS = [
  { key: "colorChange", label: "色落ち・風合いの変化についてご説明済み" },
  { key: "shapeChange", label: "型崩れ・付属品破損のリスクについてご説明済み" },
  { key: "stainNotFull", label: "既存のシミ・傷が完全に除去できない場合があることをご説明済み" },
  { key: "customerConfirmed", label: "上記についてお客様のご確認をいただきました" },
];

// 了解確認事項：現状確認チェック項目（該当するものを選択）
const CONFIRM_CHECK_ITEMS = [
  "装飾", "プリント", "毛玉", "毛羽立ち", "色移り", "色落ち", "合成皮革", "ボンディング",
  "プリーツ", "海外製品", "絵表示なし", "ボタン割れ", "ボタン無し", "剥離", "ブクツキ", "経年劣化",
  "伸縮", "変退色", "スレ", "穴", "糸引き", "破れ", "キズ", "ほつれ", "白化",
];
// 了解確認事項：印刷用の文章化（作成時はチェックのみ、印刷時にこの文章を箇条書き表示）
const CONFIRM_CHECK_TEXT = {
  "装飾": "装飾には十分に気を付けますが、経年劣化により破損する場合があります。",
  "プリント": "特性によりクリーニングにて薄れる・剥がれる可能性があります。",
  "毛玉": "既に毛玉になっている箇所があります。",
  "毛羽立ち": "既に毛羽立っている箇所がございます。",
  "色移り": "既に色移りしている、色移りする可能性があります。",
  "色落ち": "クリーニングをすることで色が落ちてしまう可能性があります。",
  "合成皮革": "生地の製造から3～5年で劣化しクリーニングをきっかけに剥離・ひび割れが生じる場合があります。",
  "ボンディング": "2枚の生地をポリウレタン樹脂を用いて貼り合わせた生地を使用しています。生地の製造から3～5年で劣化しクリーニングをきっかけにブクツキ・剥離が生じる場合があります。",
  "プリーツ": "特性により着用やクリーニングにて弱くなる・消失する可能性があります。",
  "海外製品": "海外製品につきメーカー保証を受けることができません。",
  "絵表示なし": "絵表示がないお品物は、素材や洗濯絵表示が確認できないため担当者の判断で作業をさせていただきますが、安全クリーニングができる保証はありません。【補償は賠償基準に準ずる】",
  "ボタン割れ": "ボタンが割れ・ヒビがございます。",
  "ボタン無し": "ボタンがない箇所があります。",
  "剥離": "既に剥離している箇所があります。クリーニングにより、症状が拡大・進行する可能性があります。",
  "ブクツキ": "既にブクツキが発生している箇所がございます。クリーニングにより、症状が拡大・進行する可能性があります。",
  "経年劣化": "時間の経過により製品に劣化が生じています。",
  "伸縮": "既に伸びているもしくは縮んでいる箇所があります。",
  "変退色": "既に変色・退色している箇所があります。",
  "スレ": "既にスレがある箇所がございます。",
  "穴": "既に穴がある箇所がございます。クリーニングにより、症状が拡大・進行する可能性があります。",
  "糸引き": "糸引きがある箇所があります。",
  "破れ": "既に破れ・破損している箇所があります。クリーニングにより、症状が拡大・進行する可能性があります。",
  "キズ": "既にキズがある箇所がございます。",
  "ほつれ": "既にほつれがある箇所がございます。クリーニングにより、症状が拡大・進行する可能性があります。",
  "白化": "擦れによる白化がクリーニングにより、顕著化する可能性があります。",
};

// クリーニングカスタマイズ：選択グループ（単一選択・省略可）
const CUSTOMIZE_GROUPS = [
  { key: "wash", label: "洗い方", options: ["お任せ", "ドライ", "ランドリー", "ウェット"] },
  { key: "button", label: "ボタン", options: ["ガード希望", "外して洗い希望"] },
  { key: "hanger", label: "ハンガー", options: ["DXハンガー", "Uハンガー", "ピンチハンガー"] },
  { key: "wrap", label: "包装", options: ["両面不織布", "片面不織布", "タタミ"] },
];
// オプション加工（複数選択・シミ抜きは金額上限付き）
const CUSTOMIZE_OPTIONS = ["汗抜き", "防虫", "はっ水", "シロセット", "毛玉取り", "リフォーム", "シミ抜き"] ;
const CUSTOMIZE_STANDARD_NOTE = "標準で静電気防止加工・トリートメント加工・サイジング加工が付いております";

// お客様からのご要望 チェック項目（省略可）
const REQUEST_ITEMS = [
  "汚れが気になる", "シワが気になる", "シルエットを気を付けてほしい", "ニオイが気になる",
  "変退色が気になる", "伸縮しないように気を付けてほしい", "高額品だから気を付けてほしい",
  "メンテナンスしてほしい", "風合い変化に気を付けてほしい", "他店で断られた",
];

const kToday = () => new Date().toISOString().slice(0, 10);
const kNewId = () => "k" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// カルテNo.（作成時に1回だけ発行される連番。機端ローカルのカウンターなので、複数拠点で同時作成すると衝突の可能性はあるが、
// 現状localStorageのみの保存なのでこの方式とする（クラウド連携時にサーバー発行式への切り替えを検討）
const KARTE_COUNTER_KEY = "miwa.karte.counter.v1";
const genKarteNo = () => {
  let n = 1;
  try { n = (parseInt(localStorage.getItem(KARTE_COUNTER_KEY), 10) || 0) + 1; } catch (e) {}
  try { localStorage.setItem(KARTE_COUNTER_KEY, String(n)); } catch (e) {}
  return "K" + String(n).padStart(5, "0");
};

const yenK = (n) => "¥" + Math.round(n || 0).toLocaleString("ja-JP");
const dateSlashK = (s) => {
  if (!s) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[1]}/${+m[2]}/${+m[3]}` : s;
};

const blankKarte = (store) => ({
  id: kNewId(),
  no: genKarteNo(),
  store: store || KARTE_STORES[0],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  receivedDate: kToday(),
  deliveryDate: "",
  customerNo: "",
  customerName: "",
  contactPhone: "",
  contactPrefDay: "",
  contactPrefTime: "",
  tagNo: "",
  requestChecks: [],
  request: "",
  custom: { wash: "", button: "", hanger: "", wrap: "", options: [], stainLimit: "" },
  proposal: "",
  customization: "",
  item: { category: KARTE_CATEGORIES[0], brand: "", serialNo: "", color: "", purchasePrice: "", purchaseTime: "", showPurchasePrice: true },
  measurements: [],
  diagramType: "garment",
  pins: [],
  photos: [],
  printPhotoId: "",
  pricing: { cleaningFee: 0, hasCompensation: false, compensationFee: 0, optionFee: 0, catalogItemId: "", catalogItemName: "" },
  confirmations: { checks: [], colorChange: false, shapeChange: false, stainNotFull: false, customerConfirmed: false, note: "", advice: "" },
});

const karteTotal = (k) => {
  const p = k.pricing || {};
  return (Number(p.cleaningFee) || 0) + (p.hasCompensation ? (Number(p.compensationFee) || 0) : 0) + (Number(p.optionFee) || 0);
};

// ── localStorage 入出力 ──────────────────────────────────
const loadKarteList = () => {
  try { const a = JSON.parse(localStorage.getItem(KARTE_LS_KEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; }
};
const saveKarteList = (list) => { try { localStorage.setItem(KARTE_LS_KEY, JSON.stringify(list)); } catch (e) {} };

// ── 添付写真を縮小して dataURL 化（即時プレビュー用） ────
const MAX_KARTE_DIM = 1400;
const readKarteFile = (file) => new Promise((resolve) => {
  const isImg = /^image\//.test(file.type);
  if (!isImg) { resolve({ name: file.name, size: file.size, isImg: false }); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_KARTE_DIM || height > MAX_KARTE_DIM) {
        const scale = MAX_KARTE_DIM / Math.max(width, height);
        width = Math.round(width * scale); height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      const url = canvas.toDataURL("image/jpeg", 0.85);
      resolve({ name: file.name, size: file.size, isImg: true, url, thumb: url });
    };
    img.onerror = () => resolve({ name: file.name, size: file.size, isImg: true, url: reader.result, thumb: reader.result });
    img.src = reader.result;
  };
  reader.onerror = () => resolve({ name: file.name, size: file.size, isImg });
  reader.readAsDataURL(file);
});

// ── CRUD フック（みわ共有API・シート「カルテ」で全拠点同期） ──────
// 行の形: { id, store, updatedAt, json }（json にカルテ一式を丸ごと保存。シフトの SHIFT_SHEET と同じ方式）
const KARTE_SHEET = "カルテ";
const karteRow = (k) => ({
  id: k.id, store: k.store, updatedAt: k.updatedAt || Date.now(),
  // 写真はDriveのfileIdのみを保存（base64を含めるとシートの1セル文字数上限（5万文字）を超えてデータが壊れる事故を防ぐ）
  json: JSON.stringify({ ...k, photos: (k.photos || []).map((p) => ({ id: p.id, name: p.name, size: p.size, fileId: p.fileId || "" })) }),
});

// Driveサムネイ/閉覧用URL（iOS SafariのサードパーティCookie制限を避けるため lh3 を使用）
const driveThumbK = (id, w) => `https://lh3.googleusercontent.com/d/${id}=w${w || 500}`;
const driveViewK = (id) => `https://drive.google.com/file/d/${id}/view`;
// 表示用URLを解決（DriveにあればDriveを優先して他端末でも見えるようにする。未アップロードなら端末内dataURLにフォールバック）
const kPhotoThumb = (p, w) => p.fileId ? driveThumbK(p.fileId, w || 500) : (p.url || "");
const kPhotoOpen = (p) => p.fileId ? driveThumbK(p.fileId, 1800) : (p.url || "");

// 未アップロード（fileId無し）の写真をDriveへ順次アップロード
const uploadKartePhotos = async (photos, onProgress) => {
  if (!photos || !photos.length) return { photos: photos || [], uploadedAny: false };
  const need = photos.filter((p) => !p.fileId && p.url).length;
  let processed = 0, uploadedAny = false;
  const out = [];
  for (const p of photos) {
    if (p.fileId || !p.url) { out.push(p); continue; }
    const b64 = (p.url || "").split(",")[1];
    if (!b64) { out.push(p); continue; }
    if (onProgress) onProgress({ done: processed, total: need });
    try {
      const res = await window.cloudUploadFile(p.name, "image/jpeg", b64);
      if (res && res.ok && res.fileId) { out.push({ ...p, fileId: res.fileId }); uploadedAny = true; }
      else out.push(p);
    } catch (e) { out.push(p); }
    processed++;
    if (onProgress) onProgress({ done: processed, total: need });
  }
  return { photos: out, uploadedAny };
};

// 書き込みキュー：連続保存（例：ジャケット→すぐコートに変更して再保存）で、
// 後発の書き込みリクエストがネットワークの遅延で先に届いてしまい、
// 古い内容が最後に上書きしてしまう事故を防ぐ（発行順に必ず直列実行する）
let _karteWriteQueue = Promise.resolve();
const queuedKarteCloudWrite = (fn) => {
  _karteWriteQueue = _karteWriteQueue.then(fn, fn);
  return _karteWriteQueue;
};

const useKarteData = () => {
  const [list, setList] = React.useState(() => loadKarteList());
  const [cloudOn, setCloudOn] = React.useState(false);
  const [cloudTs, setCloudTs] = React.useState(0);
  const [syncStatus, setSyncStatus] = React.useState("idle"); // idle | saving | ok | error（保存が実際にクラウドへ届いたかの確認用）

  // 初回GETが一度失敗しただけでクラウド書き込みを永久に諦めないよう、数回リトライする
  const fetchWithRetry = async (tries) => {
    for (let i = 0; i < tries; i++) {
      const remote = await window.cloudGet(KARTE_SHEET);
      if (remote != null) return remote;
      await new Promise((r) => setTimeout(r, 1500));
    }
    return null;
  };

  React.useEffect(() => {
    if (typeof window.cloudGet !== "function") return; // polished-cloud.jsx 未読込時は従来通り localStorage のみ
    let cancelled = false;
    (async () => {
      const remote = await fetchWithRetry(3);
      if (cancelled || remote == null) return; // 数回試みても応答なし＝真にオフラインの場合のみ、ローカルのみで継続
      setCloudOn(true);
      const remoteById = {};
      remote.forEach((r) => { try { remoteById[r.id] = JSON.parse(r.json); } catch (e) {} });
      if (Object.keys(remoteById).length === 0) {
        setList((cur) => {
          if (cur.length) window.cloudReplaceAll(KARTE_SHEET, cur.map(karteRow)); // 初回：ローカルをクラウドへ移行
          return cur;
        });
        setCloudTs(Date.now());
        return;
      }
      setList((curLocal) => {
        // ローカル（未同期の編集が残っている可能性）とクラウドを updatedAt で突き合わせ、
        // 新しい方を採用する（クラウドが古ければローカルを正としてクラウドへ復元＝上書き事故の防止）
        const merged = [];
        const seen = new Set();
        curLocal.forEach((localRec) => {
          seen.add(localRec.id);
          const remoteRec = remoteById[localRec.id];
          if (!remoteRec) merged.push(localRec);
          else if ((localRec.updatedAt || 0) > (remoteRec.updatedAt || 0)) merged.push(localRec);
          else merged.push(remoteRec);
        });
        Object.keys(remoteById).forEach((id) => { if (!seen.has(id)) merged.push(remoteById[id]); });
        merged.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        saveKarteList(merged);
        merged.forEach((rec) => {
          const remoteRec = remoteById[rec.id];
          if (!remoteRec || (rec.updatedAt || 0) > (remoteRec.updatedAt || 0)) queuedKarteCloudWrite(() => window.cloudUpdate(KARTE_SHEET, rec.id, karteRow(rec)));
        });
        return merged;
      });
      setCloudTs(Date.now());
    })();
    return () => { cancelled = true; };
  }, []);

  const upsertKarte = (karte) => {
    const withTs = { ...karte, updatedAt: Date.now() };
    setList((prev) => {
      const idx = prev.findIndex((k) => k.id === karte.id);
      const next = [...prev];
      if (idx >= 0) next[idx] = withTs; else next.unshift(withTs);
      saveKarteList(next);
      return next;
    });
    // cloudOn（初回読込の成否）に関わらず、クラウド設定さえあれば書き込みを試みる。
    // 初回GETがたまたま失敗しただけで以後ずっとクラウド未反映になる事故を防ぐ。
    if (typeof window.cloudUpdate === "function" && window.cloudEnabled && window.cloudEnabled()) {
      setSyncStatus("saving");
      queuedKarteCloudWrite(async () => {
        // 未アップロードの写真を先にDriveへ送信してfileIdを確定させてから保存
        const { photos, uploadedAny } = await uploadKartePhotos(withTs.photos);
        const finalKarte = { ...withTs, photos };
        if (uploadedAny) {
          setList((prev) => prev.map((k) => (k.id === withTs.id ? finalKarte : k)));
          saveKarteList(loadKarteList().map((k) => (k.id === withTs.id ? finalKarte : k)));
        }
        return window.cloudUpdate(KARTE_SHEET, finalKarte.id, karteRow(finalKarte));
      })
        .then((res) => {
          if (res && res.ok !== false) { setSyncStatus("ok"); setCloudTs(Date.now()); }
          else setSyncStatus("error");
        })
        .catch(() => setSyncStatus("error"));
    }
  };
  const removeKarte = (id) => {
    setList((prev) => {
      const next = prev.filter((k) => k.id !== id);
      saveKarteList(next);
      return next;
    });
    if (typeof window.cloudDelete === "function" && window.cloudEnabled && window.cloudEnabled()) {
      queuedKarteCloudWrite(() => window.cloudDelete(KARTE_SHEET, id));
    }
  };
  return { list, upsertKarte, removeKarte, cloudOn, cloudTs, syncStatus };
};

Object.assign(window, {
  KARTE_LS_KEY, KARTE_SHEET, KARTE_STORES, KARTE_CATEGORIES, CATEGORY_DIAGRAM, MEASURE_PRESETS, CONFIRM_ITEMS, CONFIRM_CHECK_ITEMS, CONFIRM_CHECK_TEXT, REQUEST_ITEMS,
  CUSTOMIZE_GROUPS, CUSTOMIZE_OPTIONS, CUSTOMIZE_STANDARD_NOTE,
  kToday, kNewId, genKarteNo, yenK, dateSlashK, blankKarte, karteTotal,
  loadKarteList, saveKarteList, readKarteFile, useKarteData,
  driveThumbK, driveViewK, kPhotoThumb, kPhotoOpen,
});
