# NBA Detector

A TamperMonkey script for detecting NBA games, so you never need to watch a mid-game commercial again.
During a commercial break, mute your stream and put the tab in the background. Whenever the game comes back on, the stream will automatically unmute itself using an ML5 model trained to detect live games.

## Getting Started

Download TamperMonkey for Chrome [here](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en).
Add the contents of script.js to your installed userscripts on the TamperMonkey dashboard. At the top of the file, add as many `@include` tags as you'd like for any sites where you watch NBA streams in order for the script to run on those sites.

### Uploading the Model

The trained model files are named `ml5_basketball_model.json`, `ml5_basketball_model.weights.bin`, and `ml5_basketball_model_meta.json`.
The model data file is named `ml5_basketball_model_data.json`.

You have two options for uploading the model.

1. Host a simple HTTP server at port 8080 serving the model files - a simple solution is to run [http-server](https://www.npmjs.com/package/http-server) in a directory with these files. The browser will alert you when the model has loaded.
2. Set `manualUpload = true` at the top of script.js. You will instead be prompted to upload the files manually by a modal. The text of the modal will change to indicate the model has loaded when ready.

### Further Training the Model

If the model innacurately classifies the stream (or even if you want to train your own model from scratch, for examples, for NFL streams) you can further train the model yourself. At the bottom of your web page, the script appends classified images with their scores. If you click on any of these images your browser will prompt you - select "OK" to indicate the image is of an active NBA game, or select "Cancel" to indicate the image is <strong>not</strong> of an active NBA game. You can also trigger a classification manually by typing `c`, and again, clicking the image at the bottom of the page. 

Once you have collected the data you'd like, type `s` to prompt the browser, and select `cancel` to download the data. Then, at the top of script.js set `shouldLoadModel = true` to only load the data (or if you're using the manual process, simply don't upload the model files). Then, type `t` to train a new model based on this data. You will be prompted once this training has completed. Type `s` again, and this time select `OK` to download the newly trained model files.

## Hotkeys

f - Puts the video into fullscreen (see the handleKeyDown method of script.js if the document selector does not work for your streaming site).

m - Mutes the video (see the handleKeyDown method of script.js if the document selector does not work for your streaming site).

y - Adds the currently displayed image on the video stream to the collection of data for the model under 'y' indicating that the image is of an active NBA game.

n - Adds the currently displayed image on the video stream to the collection of data for the model under 'n' indicating that the image is <strong>not</strong> of an active NBA game.

t - Initiate training of the model with the uploaded data (note that a trained model must not have been uploaded for this command to work).

c - Classify the currently displayed image on the video stream. The image will be appended to the bottom of the page along with its clasification and score.

s - Initiate a browser prompt - select "OK" to download the trained model files, or select "Cancel" to download the data files.