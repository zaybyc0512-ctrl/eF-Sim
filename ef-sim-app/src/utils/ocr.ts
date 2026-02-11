import Tesseract from 'tesseract.js';

export interface OCRResult {
  fullText: string;
  nameText?: string;
  teamText?: string;
  nationalityText?: string;
  cardTypeText?: string;
}

/**
 * 画像を指定エリアで切り抜き、かつOCR用に「白黒反転・二値化」する関数
 * @param file Source file
 * @param region {x, y, w, h} as percentages (0-1)
 * @param binarize Whether to perform binarization (black text on white background)
 * @param threshold Binarization threshold (0-255). Lower values pick up darker gray text. Default 100.
 */
async function cropAndProcessImage(
  file: File | Blob,
  region: { x: number, y: number, w: number, h: number },
  binarize: boolean = true,
  threshold: number = 100
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const w = img.width;
      const h = img.height;

      const sx = w * region.x;
      const sy = h * region.y;
      const sWidth = w * region.w;
      const sHeight = h * region.h;

      canvas.width = sWidth;
      canvas.height = sHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // 1. 画像を描画（切り抜き）
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);

      // 2. 画像処理（白黒反転・強調） - binarizeフラグがtrueの場合のみ実行
      if (binarize) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;

          // 黄色い文字や白文字（明るい色）を黒に、背景（暗い色）を白にする
          // thresholdより明るい(大きい)と黒(0)、暗い(小さい)と白(255)
          const val = gray > threshold ? 0 : 255;

          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
        }

        ctx.putImageData(imageData, 0, 0);
      }

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Process failed'));
      });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * 画像全体、および特定エリアのOCRを実行する
 */
export async function analyzeImage(file: File | Blob): Promise<OCRResult> {
  // 日本語優先設定
  const worker = await Tesseract.createWorker('jpn+eng');

  // 1. Name Analysis (Fixed Top-Left Area)
  // 選手名エリア（明るい文字）はデフォルトの閾値(100)でOK
  const nameBlob = await cropAndProcessImage(file, { x: 0.02, y: 0.10, w: 0.50, h: 0.15 }, true, 100);
  const nameRet = await worker.recognize(nameBlob);
  let nameText = nameRet.data.text.trim();

  // ノイズ除去: 日本語・英数字・スペース以外を削除
  nameText = nameText.replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s]/g, '');


  // 2. Scan Right Side Area
  // 画像の右側70%をスキャンする。見出し文字がグレーなので閾値60
  const rightBlob = await cropAndProcessImage(file, { x: 0.3, y: 0, w: 0.7, h: 1 }, true, 60);
  const rightRet = await worker.recognize(rightBlob);

  // デバッグログ
  console.log('Right Side OCR Text (Thresh 60):', rightRet.data.text);

  const fullText = rightRet.data.text;
  const lines = fullText.split('\n');

  const findValueByLine = (keywords: string[]): string => {
    for (const line of lines) {
      // 行の先頭20文字を取得
      const prefix = line.substring(0, 20);

      // キーワード文字が2つ以上含まれているかチェック
      let matchCount = 0;
      for (const k of keywords) {
        if (prefix.includes(k)) matchCount++;
      }

      if (matchCount >= 2) {
        // その行の中で、最後に見つかったキーワード文字の位置を探す
        let lastIndex = -1;
        for (const k of keywords) {
          const idx = line.lastIndexOf(k);
          if (idx > lastIndex) lastIndex = idx;
        }

        if (lastIndex !== -1) {
          // その位置より後ろの文字列を切り出す
          let value = line.substring(lastIndex + 1);

          // 先頭の記号やスペースを除去 (trim with leading symbols cleanup)
          // : ・ - … ] ) 、などを除去
          value = value.replace(/^[\s:・\-…\]\)]+/, '');

          return value.trim();
        }
      }
    }
    return '';
  };

  // キーワード指定 (行解析用)
  const nationalityText = findValueByLine(['国', '籍', '地', '域']);
  const teamText = findValueByLine(['所', '属', 'ク', 'ラ', 'ブ', 'チ', 'ー', 'ム']);
  const cardTypeTextRaw = findValueByLine(['種', '別']);

  // 日付フォーマット補完
  let cardTypeText = cardTypeTextRaw.replace(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2})$/, "$1 $2 '$3");

  await worker.terminate();
  return { fullText, nameText, teamText, nationalityText, cardTypeText };
}

/**
 * 能力値認識用の設定パターン
 */
/**
 * 文字列の正規化（OCR揺らぎ吸収用）
 */
function normalizeOcrText(text: string): string {
  if (!text) return '';
  // 1. 空白の除去
  let s = text.replace(/[\s\u3000]/g, '');

  // 2. 濁音・半濁音をすべて清音に変換
  const voicedMap: Record<string, string> = {
    'ガ': 'カ', 'ギ': 'キ', 'グ': 'ク', 'ゲ': 'ケ', 'ゴ': 'コ',
    'ザ': 'サ', 'ジ': 'シ', 'ズ': 'ス', 'ゼ': 'セ', 'ゾ': 'ソ',
    'ダ': 'タ', 'ヂ': 'チ', 'ヅ': 'ツ', 'デ': 'テ', 'ド': 'ト',
    'バ': 'ハ', 'ビ': 'ヒ', 'ブ': 'フ', 'ベ': 'ヘ', 'ボ': 'ホ',
    'パ': 'ハ', 'ピ': 'ヒ', 'プ': 'フ', 'ペ': 'ヘ', 'ポ': 'ホ',
    'ヴ': 'ウ'
  };
  s = s.replace(/[ガ-ポヴ]/g, m => voicedMap[m] || m);

  // 3. 小文字を大文字に変換
  const smallMap: Record<string, string> = {
    'ァ': 'ア', 'ィ': 'イ', 'ゥ': 'ウ', 'ェ': 'エ', 'ォ': 'オ',
    'ッ': 'ツ', 'ャ': 'ヤ', 'ュ': 'ユ', 'ョ': 'ヨ'
  };
  s = s.replace(/[ァ-ョ]/g, m => smallMap[m] || m);

  // 4. 長音符、ハイフン、漢字の「一」を完全除去
  s = s.replace(/[ー\-－一]/g, '');

  return s;
}

/**
 * 能力値ラベルのエイリアス定義
 */
const STAT_ALIASES: Record<string, string[]> = {
  'offensive_awareness': ['オフェンスセンス'],
  'ball_control': ['ボールコントロール'],
  'dribbling': ['ドリブル'],
  'tight_possession': ['ボールキープ'],
  'low_pass': ['グラウンダーパス'],
  'loft_pass': ['フライパス'],
  'finishing': ['決定力', 'RED', 'REND', 'REN', 'REMD'], // 決定力の誤読対策
  'heading': ['ヘディング'],
  'place_kicking': ['プレースキック'],
  'curl': ['カーブ'],
  'defensive_awareness': ['ディフェンスセンス'],
  'tackling': ['ボール奪取'],
  'aggression': ['アグレッシブネス'],
  'defensive_engagement': ['守備意識'],
  'speed': ['スピード'],
  'acceleration': ['瞬発力'],
  'kicking_power': ['キック力'],
  'jump': ['ジャンプ'],
  'physical_contact': ['フィジカルコンタクト'],
  'balance': ['ボディコントロール'],
  'stamina': ['スタミナ'],
  'gk_awareness': ['GKセンス'],
  'gk_catching': ['キャッチング'],
  'gk_clearing': ['クリアリング'],
  'gk_reflexes': ['コラプシング'],
  'gk_reach': ['ディフレクティング']
};

/**
 * 複数の画像から能力値を読み取って統合する (正規化ロジック適用版)
 */
export async function analyzeStatsImages(files: File[]): Promise<Record<string, number>> {
  const worker = await Tesseract.createWorker('jpn+eng');
  const mergedStats: Record<string, number> = {};

  for (const file of files) {
    // リストを読むため、右側全体ではなく「中央〜右」を広く読む
    // 能力値画面は背景が暗いことが多いので、threshold 60は適切
    const blob = await cropAndProcessImage(file, { x: 0.1, y: 0, w: 0.9, h: 1 }, true, 60);
    const ret = await worker.recognize(blob);
    const lines = ret.data.text.split('\n');

    console.log(`Stats OCR Raw (${file.name}):`, ret.data.text);

    lineLoop: for (const line of lines) {
      const normalizedLine = normalizeOcrText(line);

      // 補正値（+2など）が数値抽出の邪魔にならないよう除去 (例: "+285" -> "85")
      const sanitizedLine = normalizedLine.replace(/\+[0-9]/g, '');

      for (const [key, aliases] of Object.entries(STAT_ALIASES)) {
        if (mergedStats[key] !== undefined) continue; // 既に取得済みならスキップ

        for (const alias of aliases) {
          const normalizedAlias = normalizeOcrText(alias);

          // 正規化された行の中に、正規化されたラベル(エイリアス)が含まれているか
          if (sanitizedLine.includes(normalizedAlias)) {
            // 含まれていれば、2桁か3桁の数値を抽出
            const match = sanitizedLine.match(/\d{2,3}/);
            if (match) {
              const val = parseInt(match[0], 10);
              if (val >= 40 && val <= 103) {
                mergedStats[key] = val;
                continue lineLoop; // この行の処理は終了し、次の行へ
              }
            }
          }
        }
      }
    }
  }

  await worker.terminate();
  return mergedStats;
}

/**
 * カード種別の抽出ロジック（バックアップ用）
 */
export function extractCardType(text: string): string | null {
  const cardTypeRegex = /(Big\s*Time|Epic|Show\s*Time|Highlight|Potw|Club\s*Selection)\s*[\r\n]*[\d\s]{1,3}\s+[A-Za-z]{3}\s+['’][\d\s]{2,3}/i;

  const match = text.match(cardTypeRegex);
  if (match) {
    let result = match[0];
    result = result.replace(/\s+/g, ' ');
    result = result.replace(/(Big|Show)(Time)/i, '$1 $2');
    result = result.replace(/\s(['’])/g, '$1').replace(/(['’])\s/g, '$1');
    return result.trim();
  }
  return null;
}
