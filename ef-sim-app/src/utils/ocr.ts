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


  // 2. Line Parsing (Scan Right Side Area)
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

  // 日付フォーマット補完: "11 Jan 15" のような末尾2桁の年号にアポストロフィを補完する
  // パターン: 数字1-2桁 + スペース + 英字3文字 + スペース + 数字2桁 (行末)
  // 例: "11 Jan 15" -> "11 Jan '15"
  let cardTypeText = cardTypeTextRaw.replace(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2})$/, "$1 $2 '$3");

  await worker.terminate();
  return { fullText, nameText, teamText, nationalityText, cardTypeText };
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