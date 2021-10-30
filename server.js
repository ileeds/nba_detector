const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { createFFmpeg } = require('@ffmpeg/ffmpeg');

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

const app = express();
const port = 3000;

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
})

app.use(cors());

const ffmpeg = createFFmpeg({ log: false });
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

app.get('/getJpeg', function(req, res) {
  (async () => {
    if (ffmpegLocked) {
      res.status(400).json({ error: 'ffmpegLocked' });
      return;
    }
  
    ffmpegLocked = true;

    try {
      console.log('starting getJpeg');

      if (!ffmpeg.isLoaded()) {
        await ffmpeg.load();
      }

      const { url } = req.query;
      if (!url) {
        console.log('missing url param');
        res.status(400).json({ error: 'missing url param' });
        return;
      }

      const response = await fetch(url, {
        headers: { referer: req.get('Referrer') },
      });
      if (response.status >= 300) {
        console.log(await response.text());
        res.status(400).json({ error: 'video fetch error' });
        return;
      }

      const blob = await response.blob();
      const data = new Uint8Array(await blob.arrayBuffer());
    
      await ffmpeg.FS('writeFile', 'stream.ts', data);
      await ffmpeg.run('-i', 'stream.ts', 'stream.jpg');
      const file = await ffmpeg.FS('readFile', 'stream.jpg');
      await ffmpeg.FS('unlink', 'stream.jpg');

      res.send({ jpg: file });
      console.log('success');
    } catch (e) {
      console.log(e);
      res.status(500);
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
