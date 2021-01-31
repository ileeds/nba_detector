// ==UserScript==
// @name         New Userscript
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @include      ...
// @grant        none
// ==/UserScript==

const shouldLoadModel = true;
const manualUpload = false;

const style = document.createElement('style');
style.innerHTML = `
.modal {
position: fixed;
z-index: 1000;
left: 0;
top: 0;
width: 100%;
height: 100%;
overflow: auto;
background-color: rgb(0,0,0);
background-color: rgba(0,0,0,0.4);
}

.modal-content {
background-color: #fefefe;
margin: 15% auto;
padding: 20px;
border: 1px solid #888;
width: 80%;
}
.closeModal {
color: #aaa;
float: right;
font-size: 28px;
font-weight: bold;
}

.closeModal:hover,
.closeModal:focus {
color: black;
text-decoration: none;
cursor: pointer;
}
`;
document.head.appendChild(style);

let permaMute = false;

const toggleMute = () => {
    const elem = document.querySelectorAll("[class*='media-control-icon'][data-volume]")[0];
    elem.click();
};

const getIFrame = (doc) => {
    if (!doc) {
        return null;
    }
    const iframes = [...doc.getElementsByTagName('iframe')];
    const iframe = iframes.filter((frame) => frame.allowFullscreen)[0];
    if (!iframe) {
        return null;
    }
    if (iframe.contentDocument && iframe.contentDocument.getElementsByTagName('iframe').length > 0) {
        return getIFrame(iframe.contentDocument);
    }
    return iframe;
};

let tensorLoaded = false;
const tensorScript = document.createElement('script');
tensorScript.setAttribute('src', 'https://unpkg.com/ml5@latest/dist/ml5.min.js');
tensorScript.addEventListener('load', () => {
    const options = {
        inputs: [dim, dim, 3],
        task: 'imageClassification',
        debug: true,
    };
    model = ml5.neuralNetwork(options);
    tensorLoaded = true;
});
document.head.appendChild(tensorScript);

let ffmpegLoaded = false;
const ffmpegScript = document.createElement('script');
ffmpegScript.setAttribute('src', 'https://unpkg.com/@ffmpeg/ffmpeg@0.9.5/dist/ffmpeg.min.js');
ffmpegScript.addEventListener('load', () => {
    const { createFFmpeg } = FFmpeg;
    ffmpeg = createFFmpeg({ log: false });
    ffmpegLoaded = true;
});
document.head.appendChild(ffmpegScript);

const displayCanvases = true;
const dim = 128;
let model;
let video;
let ffmpeg;
let canvasContainer;
let currCanvas = 0;

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

const getInputs = async (fromVideo = false) => {
    currCanvas += 1;
    if (currCanvas === 6) {
        currCanvas = 1;
    }

    const canvas = createCanvas(currCanvas);
    const context = canvas.getContext('2d');

    if (fromVideo) {
        context.drawImage(video, 0, 0, dim, dim);
    } else {
        const entries = window.performance.getEntriesByType("resource").filter(e => e.name && e.name.endsWith('ts'));
        if (window.performance.getEntries().length > 100) {
            performance.clearResourceTimings();
        }
        const url = entries[entries.length - 1].name;
        console.log(`reading entry ${url}`);
        const blob = await fetch(url).then(res => res.blob());
        const data = new Uint8Array(await blob.arrayBuffer());
        ffmpeg.FS('writeFile', 'stream.ts', data);
        await ffmpeg.run('-i', 'stream.ts', 'stream.jpg', '-update', '1');
        const file = ffmpeg.FS('readFile', 'stream.jpg');
        const jpegBlob = new Blob([file]);
        const bitmap = await createImageBitmap(jpegBlob);
        const jpegUrl = URL.createObjectURL(jpegBlob);
        context.drawImage(bitmap, 0, 0, dim, dim);
        ffmpeg.FS('unlink', 'stream.jpg');
    }

    const inputs = getInputsFromContext(context);

    if (displayCanvases) {
        const swapCanvas = document.getElementById(`canvas${currCanvas}`);
        swapCanvas.parentNode.replaceChild(canvas, swapCanvas);
        canvas.parentNode.parentNode.insertBefore(canvas.parentNode, canvas.parentNode.parentNode.firstChild);
    }

    return inputs;
};

const addExample = async (label) => {
    const inputs = await getInputs(true);
    const target = { label };
    console.log('adding example: ' + label);
    model.addData(inputs, target);
};

const displayLabel = (result) => {
    const canvasLabel = document.getElementById(`canvas${currCanvas}Label`);
    canvasLabel.innerHTML = `${result.label} ${result.confidence}`;
};

const gotResults = (error, results) => {
    if (error) {
        console.log(error);
        return;
    }
    console.log('results', results);
    if (displayCanvases) {
        displayLabel(results[0]);
    }
};

const detectGame = (error, results) => {
    if (error) {
        console.log(error);
        return;
    }
    console.log('results', results);
    const result = results[0];
    if (result.label === 'y' && result.confidence >= 0.95) {
        if (isMuted()) {
            toggleMute();
        }
    }
    if (displayCanvases) {
        displayLabel(result);
    }
};

const classify = async (callback, fromVideo = false) => {
    const inputs = await getInputs(fromVideo);

    model.classify(inputs, callback);
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
    } else if (key === 'y' || key === 'n') {
        addExample(key);
    } else if (key === 't') {
        console.log('initiated training');
        model.train({ epochs: 100 }, () => {
            console.log('finished training');
            alert('Finished');
        });
    } else if (key === 'c') {
        classify(gotResults, true);
    } else if (key === 's') {
        if (confirm('Model ready?')) {
            model.save('ml5_basketball_model');
        } else {
            model.saveData('ml5_basketball_model_data');
        }
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

const beep = () => {
    const snd = new Audio('data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=');
    snd.play();
};

const startInterval = async () => {
    await ffmpeg.load();

    setInterval(async () => {
        if (!isTabActive && !permaMute) {
            if (video.readyState < video.HAVE_FUTURE_DATA) {
                if (beepCounter < 5) {
                    beep();
                    beepCounter+=1;
                }
            } else {
                beepCounter = 0;
            }
            if (isMuted()) {
                classify(detectGame);
            }
        }
    }, 5000);
};

const classifyCanvas = (canvas) => {
    const label = confirm('Game?') ? 'y' : 'n';
    const target = { label };
    console.log('classifying image: ' + label);
    const context = canvas.getContext('2d');
    const inputs = getInputsFromContext(context);
    model.addData(inputs, target);
};

const createCanvasContainer = (num) => {
    const canvasContainer = document.createElement('div');
    canvasContainer.id = `canvas${num}Container`;
    canvasContainer.style.marginRight = '8px';
    const canvas = createCanvas(num);
    canvasContainer.appendChild(canvas);
    const canvasLabel = document.createElement('label');
    canvasLabel.id = `canvas${num}Label`;
    canvasContainer.appendChild(canvasLabel);
    return canvasContainer;
};

const createCanvases = () => {
    canvasContainer = document.createElement('div');
    canvasContainer.style.display = displayCanvases ? 'flex' : 'none';
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

let dataLoaded = false;
let modelLoaded = false;

const initModel = async () => {
    const metaP = fetch('http://localhost:8080/ml5_basketball_model_meta.json');
    const modelP = fetch('http://localhost:8080/ml5_basketball_model.json');
    const weightsP = fetch('http://localhost:8080/ml5_basketball_model.weights.bin');
    const dataP = fetch('http://localhost:8080/ml5_basketball_model_data.json');
    const [metaR, modelR, weightsR, dataR] = await Promise.all([metaP, modelP, weightsP, dataP]);
    const [metaB, modelB, weightsB, dataB] = await Promise.all([metaR.blob(), modelR.blob(), weightsR.blob(), dataR.blob()]);

    if (shouldLoadModel) {
        const metaF = new File([metaB], 'ml5_basketball_model_meta.json');
        const modelF = new File([modelB], 'ml5_basketball_model.json');
        const weightsF = new File([weightsB], 'ml5_basketball_model.weights.bin');
        const modelList = new DataTransfer();
        modelList.items.add(metaF);
        modelList.items.add(modelF);
        modelList.items.add(weightsF);
        model.load(modelList.files, () => {
            modelLoaded = true;
            if (dataLoaded) {
                alert('Ready');
                startInterval();
            }
            console.log('Model Loaded');
        });
    }

    const dataF = new File([dataB], 'ml5_basketball_model_data.json');
    const dataList = new DataTransfer();
    dataList.items.add(dataF);
    model.loadData(dataList.files, () => {
        dataLoaded = true;
        if (modelLoaded || !shouldLoadModel) {
            alert('Ready');
            startInterval();
        }
        console.log('Data Loaded');
    });
};

const createModal = async () => {
    const modal = document.createElement('div');
    modal.innerHTML = `
<!-- The Modal -->
<div id="myModal" class="modal">

<!-- Modal content -->
<div class="modal-content">
<span class="closeModal">&times;</span>
<div>
<label id="modelInputLabel" for="modelInput" class="btn">Upload Model</label>
<input id="modelInput" type="file" multiple>
</div>
<div>
<label id="dataInputLabel" for="dataInput" class="btn">Upload Data</label>
<input id="dataInput" type="file" multiple>
</div>
</div>

</div>
`;
    document.body.prepend(modal);
    const closeModal = modal.getElementsByClassName('closeModal')[0];
    closeModal.addEventListener('click', () => {
        document.getElementById('myModal').style.display = 'none';
        startInterval();
    });

    const modelInput = document.getElementById('modelInput');
    modelInput.addEventListener('change', () => {
        model.load(modelInput.files, () => {
            console.log('Model Loaded', modelInput.files);
            document.getElementById('modelInputLabel').innerHTML = 'Model Loaded';
        });
    });

    const dataInput = document.getElementById('dataInput');
    dataInput.addEventListener('change', () => {
        model.loadData(dataInput.files, () => {
            console.log('Data Loaded');
            document.getElementById('dataInputLabel').innerHTML = 'Data Loaded';
        });
    });
};

let interval = setInterval(() => {
    video = document.getElementsByTagName('video')[0];
    if (video && tensorLoaded && ffmpegLoaded) {
        clearInterval(interval);
        video.muted = true;
        video.click();
        video.muted = false;

        if (manualUpload) {
            createModal();
        } else {
            initModel();
        }
        createCanvases();
    }
}, 50);

window.onload = () => {
    const elem = getIFrame(document);
    if (elem) {
        const src = elem.getAttribute('src');
        window.top.location.replace(src);
    }
};
