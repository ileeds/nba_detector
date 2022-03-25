// ==UserScript==
// @name         New Userscript
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @include      ...
// @grant        none
// ==/UserScript==

const serverUrl = 'your_server_url';
const modelPath = 'your_model_url';
const shouldCaptureScreen = false;

let permaMute = false;

const toggleMute = () => {
  const elem = document.querySelectorAll("[class*='media-control-icon'][data-volume]")[0];
  if (!elem) {
    if (video.volume === 0 || video.muted) {
      video.volume = 1;
      video.muted = false;
    } else {
      video.volume = 0;
      video.muted = true;
    }
  } else {
    elem.click();
  }
};

const getIFrame = (doc) => {
  if (!doc) {
    return null;
  }
  const iframes = [...doc.getElementsByTagName('iframe')];
  const iframe = iframes.filter((frame) => frame.allowFullscreen || frame.hasChildNodes())[0];
  if (!iframe) {
    return null;
  }
  if (iframe.contentDocument && iframe.contentDocument.getElementsByTagName('iframe').length > 0) {
    const nestedIframe = getIFrame(iframe.contentDocument);
    if (nestedIframe) {
      return nestedIframe;
    }
  }
  return iframe;
};

let tensorLoaded = false;
const tensorScript = document.createElement('script');
tensorScript.setAttribute('src', 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@2.0.0/dist/tf.min.js');
tensorScript.addEventListener('load', async () => {
  tensorLoaded = true;
});
document.head.appendChild(tensorScript);

const audioContext = new AudioContext();
const gain = audioContext.createGain();

const beepSuccess = () => {
  beep(864);
};

const beepError = () => {
  beep(432);
};

const beep = (hz) => {
  const oscillator = audioContext.createOscillator();
  oscillator.frequency.value = hz;
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(0);
  oscillator.stop(audioContext.currentTime + 0.05);
};

const dim = 128;
let model;
let video;
let screenVideo;
let currCanvas = 0;
let dataSet = [];

const getInputsFromContext = (context) => {
  const inputs = [];
  const imageData = context.getImageData(0, 0, dim, dim);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i + 0] / 255;
    let g = data[i + 1] / 255;
    let b = data[i + 2] / 255;
    inputs.push(r, g, b);
  }
  return inputs;
};

const createCanvas = (num) => {
  const canvas = document.createElement('canvas');
  canvas.id = `canvas${num}`;
  canvas.width = dim;
  canvas.height = dim;
  canvas.style.display = 'block';
  canvas.addEventListener('click', () => classifyCanvas(canvas));
  return canvas;
};

const getJpeg = async (url) => {
  const response = await fetch(`${serverUrl}/getJpeg?url=${encodeURIComponent(url)}`, {
    headers: { 'Bypass-Tunnel-Reminder': true }
  });
  if (response.status !== 200) {
    throw new Error('Invalid getJpeg response');
  }
  const json = await response.json();
  return json.jpg;
};

const getInputs = async (fromVideo = false) => {
  currCanvas += 1;
  if (currCanvas === 6) {
    currCanvas = 1;
  }

  const canvas = document.getElementById(`canvas${currCanvas}`);
  const context = canvas.getContext('2d');

  if (shouldCaptureScreen) {
    context.drawImage(screenVideo, 0, 0, dim, dim);
  } else {
    if (fromVideo) {
      context.drawImage(video, 0, 0, dim, dim);
    } else {
      const entries = window.performance.getEntriesByType("resource").filter(e => e.name && (e.name.includes('.ts') || e.name.includes('.m3u8')) && !e.name.startsWith(serverUrl));
      if (window.performance.getEntries().length > 100) {
        performance.clearResourceTimings();
      }
      const url = entries[entries.length - 1].name;
      console.log(`reading entry ${url}`);
      const jpg = await getJpeg(url);
      const jpgBlob = new Blob([new Uint8Array(jpg.data)]);
      const bitmap = await createImageBitmap(jpgBlob);
      context.drawImage(bitmap, 0, 0, dim, dim);
    }
  }

  const inputs = getInputsFromContext(context);

  canvas.parentNode.parentNode.insertBefore(canvas.parentNode, canvas.parentNode.parentNode.firstChild);

  return inputs;
};

const addExample = async (label) => {
  const inputs = await getInputs(true);
  if (!inputs) {
    return;
  }
  console.log('adding example: ' + label);
  addData(inputs, label);
};

const displayLabel = (result) => {
  const canvasLabel = document.getElementById(`canvas${currCanvas}Label`);
  canvasLabel.innerHTML = `${result.label === 1 ? 'yes' : 'no'} ${result.confidence}`;
};

const gotResults = (results) => {
  console.log('results', results);
  displayLabel(results[0]);
};

const detectGame = (results) => {
  console.log('results', results);
  const result = results[0];
  if (result.label === 1 && result.confidence >= 0.90) {
    if (isMuted()) {
      beepSuccess();
      toggleMute();
    }
  }
  displayLabel(result);
};

const classify = async (callback, fromVideo = false) => {
  const inputs = await getInputs(fromVideo);
  if (!inputs) {
    return;
  }
  const imageTensor = tf.tensor(inputs, [dim, dim, 3]);
  const inputTensor = imageTensor.expandDims();
  const prediction = model.predict(inputTensor);
  const scores = prediction.arraySync()[0];
  callback(Object.entries(scores).map(([k, v]) => ({
    label: parseInt(k),
    confidence: v
  })).sort((a, b) => b.confidence - a.confidence));
};

const handleKeyDown = (event) => {
  const key = event.key;
  if (key === 'f') {
    const elem = document.querySelector('[aria-label="fullscreen"]') || document.getElementsByClassName('vjs-fullscreen-control')[0];
    elem.click();
  } else if (key === 'm') {
    toggleMute();
    const ctrl = event.ctrlKey;
    permaMute = ctrl;
  } else if ((key === 'y' || key === 'n') && event.ctrlKey) {
    addExample(key === 'y' ? 1 : 0);
  } else if (key === 'c') {
    classify(gotResults, true);
  } else if (key === 's' && event.ctrlKey) {
    if (dataSet.length !== 0) {
      const csvContent = `data:text/csv;charset=utf-8,${dataSet.map(r => r.join(",")).join("\n")}`;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', "data_append.csv");
      document.body.appendChild(link);
      link.click();
      dataSet = [];
    }
  } else if (key === 'k' && event.ctrlKey) {
    dataSet = [];
    console.log('Cleared data set');
  }
};
document.addEventListener('keydown', handleKeyDown);

let isTabActive = true;
let beepCounter = 0;

window.onfocus = function () {
  isTabActive = true;
  beepCounter = 0;
};

window.onblur = function () {
  isTabActive = false;
};

const isMuted = () => {
  const hasMutedIcon = document.getElementsByClassName('media-control-icon muted').length > 0;
  return video.muted || video.volume === 0 || hasMutedIcon;
};

let locked = false;
let errorCount = 0;

const startInterval = async () => {
  setInterval(async () => {
    if (locked) {
      return;
    }
    try {
      locked = true;
      if (!isTabActive && !permaMute) {
        if (video.readyState < video.HAVE_FUTURE_DATA) {
          if (beepCounter < 5) {
            beepError();
            beepCounter += 1;
          }
        } else {
          beepCounter = 0;
        }
        if (isMuted()) {
          await classify(detectGame);
        }
      }
      errorCount = 0;
    } catch (e) {
      console.log(e);
      errorCount++;
      if (errorCount >= 4) {
        errorCount = 0;
        beepError();
      }
    } finally {
      locked = false;
    }
  }, 5000);
};

const addData = (inputs, label) => {
  dataSet.push(inputs.concat([label]));
};

const classifyCanvas = (canvas) => {
  const label = confirm('Game?') ? 1 : 0;
  console.log('classifying image: ' + label);
  const context = canvas.getContext('2d');
  const inputs = getInputsFromContext(context);
  addData(inputs, label);
};

const createCanvasContainer = (num) => {
  const canvasContainer = document.createElement('div');
  canvasContainer.id = `canvas${num}Container`;
  canvasContainer.style.marginRight = '8px';
  canvasContainer.style.backgroundColor = 'white';
  const canvas = createCanvas(num);
  canvasContainer.appendChild(canvas);
  const canvasLabel = document.createElement('label');
  canvasLabel.id = `canvas${num}Label`;
  canvasLabel.style.color = 'black';
  canvasContainer.appendChild(canvasLabel);
  return canvasContainer;
};

const createCanvases = () => {
  const canvasContainer = document.createElement('div');
  canvasContainer.style.display = 'flex';
  document.body.style.setProperty('overflow', 'scroll', 'important')
  document.body.appendChild(canvasContainer);

  const canvas1Container = createCanvasContainer(1);
  canvasContainer.appendChild(canvas1Container);

  const canvas2Container = createCanvasContainer(2);
  canvasContainer.appendChild(canvas2Container);

  const canvas3Container = createCanvasContainer(3);
  canvasContainer.appendChild(canvas3Container);

  const canvas4Container = createCanvasContainer(4);
  canvasContainer.appendChild(canvas4Container);

  const canvas5Container = createCanvasContainer(5);
  canvasContainer.appendChild(canvas5Container);
};

const initModel = async () => {
  model = await tf.loadLayersModel(tf.io.http(`${serverUrl}/models/${modelPath}/model.json`, {
    requestInit: {
      headers: { 'Bypass-Tunnel-Reminder': true }
    }
  }));
  console.log('Model Loaded');
  if (shouldCaptureScreen) {
    screenVideo = document.createElement('video');
    const displayMediaOptions = {
      video: {
        cursor: "never"
      },
      audio: false
    }

    screenVideo.srcObject = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
    await screenVideo.play();
  } else {
    beepSuccess();
  }
  startInterval();
};

const checkRedirect = () => {
  let src;
  try {
    window.parent.document;
    const elem = getIFrame(document);
    if (elem) {
      src = elem.getAttribute('src');
    }
  } catch (e) {
    src = document.location.href;
  }
  if (src && !src.includes('twitter')) {
    window.top.location.replace(src);
  }
};

let videoInterval = setInterval(() => {
  if (tensorLoaded) {
    video = [...document.getElementsByTagName('video')].filter(v => v.offsetWidth > 0 && !v.id.includes('advideo'))[0];
    if (video) {
      console.log('Found Video', video);
      clearInterval(videoInterval);
      video.muted = true;
      video.click();
      video.muted = false;
      initModel();
      createCanvases();
    }
  }
}, 50);

window.onload = () => {
  checkRedirect();
};
