const fs = require('fs');
const path = require('path');
const https = require('https');

const tesseractDir = path.join(__dirname, 'frontend', 'public', 'tesseract');
if (!fs.existsSync(tesseractDir)) {
    fs.mkdirSync(tesseractDir, { recursive: true });
}

// Copy worker and core from tesseract.js-core (dependency of tesseract.js)
const sourceWorker = path.join(__dirname, 'frontend', 'node_modules', 'tesseract.js', 'dist', 'worker.min.js');
const sourceCore = path.join(__dirname, 'frontend', 'node_modules', 'tesseract.js-core', 'tesseract-core.wasm.js');

try {
    fs.copyFileSync(sourceWorker, path.join(tesseractDir, 'worker.min.js'));
    console.log('Copied worker.min.js');
} catch (e) { console.error('Failed to copy worker', e.message); }

try {
    fs.copyFileSync(sourceCore, path.join(tesseractDir, 'tesseract-core.wasm.js'));
    console.log('Copied tesseract-core.wasm.js');
} catch (e) { console.error('Failed to copy core', e.message); }

// Download eng.traineddata
const langDataPath = path.join(tesseractDir, 'eng.traineddata.gz'); // Tesseract.js uses .gz sometimes or raw depending on version. Let's download raw eng.traineddata
const url = 'https://github.com/naptha/tessdata/raw/gh-pages/4.0.0/eng.traineddata.gz';
const file = fs.createWriteStream(langDataPath);
console.log('Downloading eng.traineddata.gz...');

https.get(url, function(response) {
  response.pipe(file);
  file.on('finish', function() {
    file.close(() => {
      console.log('Downloaded eng.traineddata.gz');
    });
  });
}).on('error', function(err) {
  fs.unlink(langDataPath, () => {});
  console.error('Error downloading language data:', err.message);
});
