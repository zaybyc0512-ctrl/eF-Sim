import Tesseract from 'tesseract.js';

/**
 * Perform OCR on a given image file.
 * @param file - The image file or blob to analyze.
 * @returns The extracted raw text string.
 */
export async function analyzeImage(file: File | Blob): Promise<string> {
  const worker = await Tesseract.createWorker('eng');
  
  // Perform recognition
  const ret = await worker.recognize(file);
  const text = ret.data.text;
  
  await worker.terminate();
  return text;
}

/**
 * Attempt to extract eFootball Card Type from text.
 * Targets patterns like "Big Time 11 Jan '15" or "Epic 08 Aug '09".
 * @param text - The raw OCR text.
 * @returns The extracted card type or null if not found.
 */
export function extractCardType(text: string): string | null {
  // Regex explanation:
  // (Big Time|Epic|Show Time|Highlight|Potw|Club Selection) -> Known card prefixes
  // \s+ -> Whitespace
  // \d{1,2} -> Day (1 or 2 digits)
  // \s+ -> Whitespace
  // [A-Za-z]{3} -> Month (3 letters, e.g., Jan, Aug)
  // \s+ -> Whitespace
  // '? -> Optional apostrophe
  // \d{2} -> Year (2 digits)
  const cardTypeRegex = /(Big Time|Epic|Show Time|Highlight|Potw|Club Selection)\s+\d{1,2}\s+[A-Za-z]{3}\s+'?\d{2}/i;
  
  const match = text.match(cardTypeRegex);
  return match ? match[0] : null;
}
