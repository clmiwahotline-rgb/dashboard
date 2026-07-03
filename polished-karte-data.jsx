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
  "装飾", "プリント", "毛玉", "毛羽", "色移り", "色落ち", "合成皮革", "ボンディング",
  "プリーツ", "海外製品", "絵表示なし", "ボタン割れ", "ボタン無し", "剥離", "ブクツキ", "経年劣化",
  "伸縮", "変退色", "スレ", "穴", "糸引き", "破れ", "キズ", "ほつれ",
];

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

const yenK = (n) => "¥" + Math.round(n || 0).toLocaleString("ja-JP");
const dateSlashK = (s) => {
  if (!s) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[1]}/${+m[2]}/${+m[3]}` : s;
};

const blankKarte = (store) => ({
  id: kNewId(),
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
  item: { category: KARTE_CATEGORIES[0], brand: "", serialNo: "", color: "", purchasePrice: "", purchaseTime: "" },
  measurements: [],
  diagramType: "garment",
  pins: [],
  pricing: { cleaningFee: 0, hasCompensation: false, compensationFee: 0, optionFee: 0 },
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
const karteRow = (k) => ({ id: k.id, store: k.store, updatedAt: k.updatedAt || Date.now(), json: JSON.stringify(k) });

const useKarteData = () => {
  const [list, setList] = React.useState(() => loadKarteList());
  const [cloudOn, setCloudOn] = React.useState(false);
  const [cloudTs, setCloudTs] = React.useState(0);

  React.useEffect(() => {
    if (typeof window.cloudGet !== "function") return; // polished-cloud.jsx 未読込時は従来通り localStorage のみ
    let cancelled = false;
    (async () => {
      const remote = await window.cloudGet(KARTE_SHEET);
      if (cancelled || remote == null) return; // オフライン／未設定時は何もしない
      setCloudOn(true);
      if (remote.length) {
        const parsed = remote
          .map((r) => { try { return JSON.parse(r.json); } catch (e) { return null; } })
          .filter(Boolean)
          .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        setList(parsed);
        saveKarteList(parsed);
        setCloudTs(Date.now());
      } else {
        setList((cur) => {
          if (cur.length) window.cloudReplaceAll(KARTE_SHEET, cur.map(karteRow)); // 初回：ローカルをクラウドへ移行
          return cur;
        });
        setCloudTs(Date.now());
      }
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
    if (cloudOn) window.cloudUpdate(KARTE_SHEET, withTs.id, karteRow(withTs));
  };
  const removeKarte = (id) => {
    setList((prev) => {
      const next = prev.filter((k) => k.id !== id);
      saveKarteList(next);
      return next;
    });
    if (cloudOn) window.cloudDelete(KARTE_SHEET, id);
  };
  return { list, upsertKarte, removeKarte, cloudOn, cloudTs };
};

Object.assign(window, {
  KARTE_LS_KEY, KARTE_SHEET, KARTE_STORES, KARTE_CATEGORIES, CATEGORY_DIAGRAM, MEASURE_PRESETS, CONFIRM_ITEMS, CONFIRM_CHECK_ITEMS, REQUEST_ITEMS,
  CUSTOMIZE_GROUPS, CUSTOMIZE_OPTIONS, CUSTOMIZE_STANDARD_NOTE,
  kToday, kNewId, yenK, dateSlashK, blankKarte, karteTotal,
  loadKarteList, saveKarteList, readKarteFile, useKarteData,
});
