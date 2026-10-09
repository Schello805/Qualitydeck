const fs = require('fs');
const pdf = require('pdf-parse');
const path = '/Users/michael/.gemini/antigravity-ide/brain/f1dde134-68c9-42e6-824b-ad0000c5d9d5/.user_uploaded/media_1791479805072.pdf';

async function extract() {
  const dataBuffer = fs.readFileSync(path);
  pdf(dataBuffer).then(function(data) {
    fs.writeFileSync('scripts/pdf-text.txt', data.text);
    console.log('Extracted ' + data.text.length + ' characters.');
  }).catch(console.error);
}

extract();
