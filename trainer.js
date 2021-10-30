const tf = require('@tensorflow/tfjs-node');

const modelPath = process.argv[2];

const imageWidth = 128;
const imageHeight = 128;
const imageChannels = 3;

const batchSize = 32;
const epochsValue = 100;
const learningRate = 0.02;

const loadData = function (dataUrl) {
    const normalize = ({xs, ys}) => {
        return {
            xs: Object.values(xs),
            ys: ys.label
        };
    };

    const transform = ({xs, ys}) => {
        return {
            xs: tf.tensor(xs, [imageWidth, imageHeight, imageChannels]),
            ys: tf.tensor1d(['', ''].map((z, i) => {
                return i === ys ? 1 : 0;
            }))
        };
    };

    return tf.data
        .csv(dataUrl, {columnConfigs: {label: {isLabel: true}}})
        .map(normalize)
        .map(transform)
        .batch(batchSize);
};

const buildModel = function () {
    const model = tf.sequential();

    model.add(tf.layers.conv2d({
        inputShape: [imageWidth, imageHeight, imageChannels],
        filters: 8,
        kernelSize: 5,
        strides: 1,
        activation: 'relu',
        kernelInitializer: 'varianceScaling',
    }));
    model.add(tf.layers.maxPooling2d({
        poolSize: [2, 2],
        strides: [2, 2],
    }));
    model.add(tf.layers.conv2d({
        filters: 16,
        kernelSize: 5,
        strides: 1,
        activation: 'relu',
        kernelInitializer: 'varianceScaling',
    }));
    model.add(tf.layers.maxPooling2d({
        poolSize: [2, 2],
        strides: [2, 2],
    }));
    model.add(tf.layers.flatten());
    model.add(tf.layers.dense({
        units: 2,
        kernelInitializer: 'varianceScaling',
        activation: 'softmax',
    }));

    model.compile({
        optimizer: tf.train.sgd(learningRate),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
    });

    return model;
}

const trainModel = async function (model, trainingData, epochs=epochsValue) {
    const options = {
        epochs: epochs,
        verbose: 0,
        callbacks: {
            onEpochBegin: async (epoch, logs) => {
                console.log(`Epoch ${epoch + 1} of ${epochs} ...`)
            },
            onEpochEnd: async (epoch, logs) => {
                console.log(`  train-set loss: ${logs.loss.toFixed(4)}`)
                console.log(`  train-set accuracy: ${logs.acc.toFixed(4)}`)
            }
        }
    };

    return await model.fitDataset(trainingData, options);
};

const run = async function () {
    const trainData = loadData(`file://./models/${modelPath}/data/model_data.csv`);
    const model = buildModel();
    model.summary();
    const info = await trainModel(model, trainData);
    console.log(info);
    await model.save(`file://./models/${modelPath}/tensorflow`);
};

run();
