import Tesseract from 'tesseract.js';

/**
 * 画像を解析してテキスト全文を返す（切り抜き＆英語モード）
 */
export const analyzeImage = async (file: File): Promise<string> => {
  try {
    // 右下のエリア（x:50%, y:70% 以降）をターゲットにする
    // ※ここを微調整することで読み取り範囲を変えられます
    const processedImage = await processImage(file, 0.5, 0.7, 1.0, 1.0);

    // 英語モードでOCR実行
    const { data: { text } } = await Tesseract.recognize(
      processedImage,
      'eng',
      {
        // logger: m => console.log(m), 
      }
    );
    return text;
  } catch (error) {
    console.error("OCR Error:", error);
    throw new Error("文字の読み取りに失敗しました。");
  }
};

/**
 * 画像処理関数（切り抜き ＋ 白黒強調）
 */
const processImage = (file: File, xRatio: number, yRatio: number, wRatio: number, hRatio: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Canvas context not found"));
        return;
      }

      const sx = img.width * xRatio;
      const sy = img.height * yRatio;
      const sWidth = img.width * (wRatio - xRatio);
      const sHeight = img.height * (hRatio - yRatio);

      canvas.width = sWidth;
      canvas.height = sHeight;

      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);

      // 二値化処理（文字をくっきりさせる）
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        const val = gray > 100 ? 0 : 255; // 文字(明るい)を黒に、背景(暗い)を白に反転
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg'));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

/**
 * テキストから種別を抽出する（柔軟な正規表現）
 */
export const extractCardType = (text: string): string | null => {
  const regex = /(Big\s*Time|Epic|Show\s*Time|Highlight)\s+[\d\s]+[A-Za-z]{3}\s+['’][\d\s]+/i;
  const match = text.match(regex);

  if (match) {
    let result = match[0];
    result = result.replace(/\s+/g, ' ');
    result = result.replace(/(Big|Show)(Time)/i, '$1 $2');
    result = result.replace(/\s(['’])/g, '$1').replace(/(['’])\s/g, '$1');
    return result.trim();
  }
  return null;
};