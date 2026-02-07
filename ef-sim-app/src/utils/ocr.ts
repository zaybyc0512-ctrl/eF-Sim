import Tesseract from 'tesseract.js';

export interface OCRResult {
  fullText: string;
  nameText?: string;
  teamText?: string;
  nationalityText?: string;
}

/**
 * 画像を指定エリアで切り抜き、かつOCR用に「白黒反転・二値化」する関数
 */
async function cropAndProcessImage(file: File | Blob, region: { x: number, y: number, w: number, h: number }): Promise<Blob> {
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

      // 2. 画像処理（白黒反転・強調）
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        // 黄色い文字や白文字（明るい色）を黒に、背景（暗い色）を白にする
        const val = gray > 100 ? 0 : 255;

        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }

      ctx.putImageData(imageData, 0, 0);

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
  // Tesseract.js v5対応: 言語をcreateWorkerの引数で指定
  const worker = await Tesseract.createWorker('eng+jpn');

  // v5ではloadLanguage/initializeは不要（createWorkerで完結）

  // 1. Full Image Analysis (種別用) - 右下エリア
  const typeBlob = await cropAndProcessImage(file, { x: 0.5, y: 0.7, w: 0.5, h: 0.3 });
  const typeRet = await worker.recognize(typeBlob);
  const fullText = typeRet.data.text;

  // 2. Region Analysis (詳細抽出)

  // Name: 左上エリア (幅を0.45に縮小してノイズ回避)
  const nameBlob = await cropAndProcessImage(file, { x: 0.02, y: 0.12, w: 0.45, h: 0.15 });
  const nameRet = await worker.recognize(nameBlob);
  const nameText = nameRet.data.text.trim();

  // Nationality: チーム名の上部 (国籍・地域) - y位置を0.20に上げ、高さを0.05に絞る
  const nationalityBlob = await cropAndProcessImage(file, { x: 0.5, y: 0.20, w: 0.45, h: 0.05 });
  const nationalityRet = await worker.recognize(nationalityBlob);
  const nationalityText = nationalityRet.data.text.trim();

  // Team: 国籍の下 (y位置を0.28に下げて国籍との被りを回避)
  const teamBlob = await cropAndProcessImage(file, { x: 0.5, y: 0.28, w: 0.45, h: 0.06 });
  const teamRet = await worker.recognize(teamBlob);
  const teamText = teamRet.data.text.trim();

  await worker.terminate();
  return { fullText, nameText, teamText, nationalityText };
}

/**
 * カード種別の抽出ロジック（変更なし）
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