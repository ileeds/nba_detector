# NBA Detector

README IS OUT OF DATE

(npm i, brew install ffmpeg)

A TamperMonkey script for detecting NBA games, so you never need to watch a mid-game commercial again.

During a commercial break, mute your stream and put the tab in the background. Whenever the game comes back on, the stream will automatically unmute itself using a tensorflow model trained to detect live games.

## Getting Started

Download TamperMonkey for Chrome [here](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en).

Add the contents of script.js to your installed userscripts on the TamperMonkey dashboard. At the top of the file, add as many `@include` tags as you'd like for any sites where you watch NBA streams in order for the script to run on those sites.

### Uploading the Model

The trained model files are named `ml5_basketball_model.json`, `ml5_basketball_model.weights.bin`, and `ml5_basketball_model_meta.json`.
The model data file is named `ml5_basketball_model_data.json`.

You have two options for uploading the model.

1. Host an HTTP server at port 8080 serving the model files - a simple solution is to run [http-server](https://www.npmjs.com/package/http-server) in a directory with these files (i.e. `npx http-server --cors`). You will hear a beep when the model has loaded (the beep will only sound if you have first interacted with the page in some way).
2. Set `manualUpload = true` at the top of script.js. You will instead be prompted to upload the files manually by a modal. The text of the modal will change to indicate the model has loaded when ready.

### Further Training the Model

If the model innacurately classifies the stream, you can further train the model yourself - or even train your own model from scratch (for example, for NFL streams). At the bottom of your web page, the script appends classified images with their scores. If you click on any of these images your browser will prompt you - select "OK" to indicate the image is of an active NBA game, or select "Cancel" to indicate the image is <strong>not</strong> of an active NBA game. You can also trigger a classification manually by typing `c`, and again, clicking the image at the bottom of the page. 

Once you have collected the data you'd like, type `ctrl + s` to download the data. Then, reload the page, but append the url parameter `train=1` (or if you're using the manual upload process, reload the page and only upload the data file, and then type `t`). This will initiate training of a new model based on this data. Make sure the window is in view in order for the training to progress. Once complete, the newly trained model files will be downloaded.

### Video Delay

If the video stream is delayed, you should hear a beeping sound while it's muted in the background (it may be helpful to refresh the page in this case).

### Screen Capture

If the video is streamed from a cross-origin iframe, the default setup may not work. At the top of script.js set `shouldCaptureScreen = true`, and when prompted, select the chrome tab you are streaming from. For best results, put the video player into fullscreen.

## Hotkeys

f - Puts the video into fullscreen (see the handleKeyDown method of script.js if the document selector does not work for your streaming site).

m - Mutes the video (see the handleKeyDown method of script.js if the document selector does not work for your streaming site).

ctrl + m - "Permanently" mutes the video (the background classification won't run to automatically unmute the video - you can re-enable auto-unmute by just typing `m`).

y - Adds the currently displayed image on the video stream to the collection of data for the model under 'y' indicating that the image is of an active NBA game.

n - Adds the currently displayed image on the video stream to the collection of data for the model under 'n' indicating that the image is <strong>not</strong> of an active NBA game.

t - Initiate training of the model with the uploaded data (note that a trained model must not have been uploaded for this command to work).

c - Classify the currently displayed image on the video stream. The image will be appended to the bottom of the page along with its clasification and score.

ctrl + s - Download the model data file.
