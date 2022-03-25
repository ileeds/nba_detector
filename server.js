const express = require('express');
const cors = require('cors');
const { spawnSync } = require('child_process');
const fs = require('fs');
const xlsx = require('xlsx');

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

const quoteKey = 'Motivational Quotes Database - https://www.sharpquotes.com';
const authorKey = '';
const workbook = xlsx.readFile('./models/quotes.xlsx');
const quotes = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
const getRandomQuote = () => {
  const quoteRow = quotes[Math.floor(Math.random() * (quotes.length - 1))];
  return `"${quoteRow[quoteKey]}" - ${quoteRow[authorKey]}`;
};

const app = express();
const port = 3000;

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
});

app.use(cors());

let ffmpegLocked = false;

app.get('/', (req, res) => {
  res.send('Up')
});

app.get('/models/:modelPath/model.json', (req, res) => {
  const file = `models/${req.params.modelPath}/tensorflow/model.json`;
  res.download(file);
});

app.get('/models/:modelPath/weights.bin', (req, res) => {
  const file = `models/${req.params.modelPath}/tensorflow/weights.bin`;
  res.download(file);
});

app.get('/getJpeg', function (req, res) {
  (async () => {
    if (ffmpegLocked) {
      res.status(400).json({ error: 'FFmpeg locked' });
      return;
    }

    ffmpegLocked = true;

    try {
      console.log('starting getJpeg');

      const { url } = req.query;
      if (!url) {
        console.log('missing url param');
        res.status(400).json({ error: 'Missing url param' });
        return;
      }

      const jpgFileName = 'stream.jpg';
      spawnSync('ffmpeg', ['-headers', `referer: ${req.get('Referrer')}`, '-i', url, '-vframes', '1', '-q:v', '2', '-y', jpgFileName])
      const jpg = fs.readFileSync(jpgFileName);

      res.send({ jpg });
      console.log(getRandomQuote());
    } catch (e) {
      console.log(e);
      res.status(500).json({ error: 'Unexpected error' });;
    } finally {
      ffmpegLocked = false;
    }
  })();
});

app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message
  });
});
