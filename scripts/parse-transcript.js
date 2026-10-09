const fs = require('fs');
const path = '/Users/michael/.gemini/antigravity-ide/brain/f1dde134-68c9-42e6-824b-ad0000c5d9d5/.system_generated/logs/transcript_full.jsonl';

const lines = fs.readFileSync(path, 'utf8').split('\n').filter(Boolean);

for (const line of lines) {
  const json = JSON.parse(line);
  if (json.content && typeof json.content === 'string' && json.content.includes('DEUTSCHE	NORM 			 November	2015')) {
    fs.writeFileSync('scripts/pdf-ocr.txt', json.content);
    console.log('Found PDF OCR output! Saved to scripts/pdf-ocr.txt');
    break;
  }
}
