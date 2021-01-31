const fs = require('fs').promises;
const express = require('express');
const DATA_DIR = './data';

const STEP_SIZE = (process.env.STEP_SIZE || 10) * 1000;
const T_RANGE = [-80, 80];

const VAL_SIZE = Math.pow(256, Uint16Array.BYTES_PER_ELEMENT);
const PRECISION = Math.pow(10, -Math.round(Math.log((T_RANGE[1] - T_RANGE[0]) / VAL_SIZE) / Math.log(10)));

const app = express();
app.use(express.text({ type: () => true }));

const getFileName = () => (new Date()).toISOString().substr(0, 10);

const readRawLogFromFile = fileName => Promise.all([
    fs.readFile(fileName),
    fs.stat(fileName)
]).then(([ file, stat ]) => ({
    data: new Uint16Array(file.buffer, file.byteOffset, file.length/2),
    stepsAgo: Math.round((new Date() - stat.mtimeMs) / STEP_SIZE)
})).catch(() => ({
    data: new Uint16Array(0),
    stepsAgo: 0
}));

const readRangedLogFromFile = (fileName, range) => readRawLogFromFile(fileName)
    .then(({ data, stepsAgo }) => []
        .map.call(data, (val, i) => i % 2 ? val :
            val === 0 ? null :
            Math.round((range[0] + val / VAL_SIZE * (range[1] - range[0])) * PRECISION) / PRECISION)
        .concat(stepsAgo > 1 ? [null, stepsAgo - 1] : [])
    )
    .catch(() => []);

const writeRangedValToFile = (fileName, range, val) => readRawLogFromFile(fileName)
    .then(({ data, stepsAgo }) => {
        const rangedVal = Math.round(VAL_SIZE * (val - range[0]) / (range[1] - range[0]));
        if (data.length < 2) {
            return fs.writeFile(fileName, Buffer.from(Uint16Array.from([rangedVal, 1]).buffer));
        }

        const last = data[data.length - 2];

        switch (stepsAgo) {
            case 0:
                if (rangedVal !== last) {
                    data[data.length - 2] = Math.round((rangedVal + last) / 2);
                }
                break;

            case 1:
                if (rangedVal === last) {
                    data[data.length - 1]++;
                } else {
                    newData = new Uint16Array(data.length + 2);
                    newData.set(data);
                    newData.set([rangedVal, 1], data.length);
                    data = newData;
                }
                break;

            default:
                newData = new Uint16Array(data.length + 4);
                newData.set(data);
                newData.set([0, stepsAgo - 1, rangedVal, 1], data.length);
                data = newData;
        }
        return fs.writeFile(fileName, Buffer.from(data.buffer, data.byteOffset, data.length * 2));
    });

app.get('/', res.send('welcome to istra'));

app.get('/t(/:date?)', (req, res) => {
    const { date } = req.params;
    const fn = (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) ? date : getFileName();

    readRangedLogFromFile(DATA_DIR + '/' + fn, T_RANGE)
        .then(s => res
            .set('Content-type', 'application/json')
            .set('Access-Control-Allow-Origin', '*')
            .send(s)
        );
});

app.post('/t', (req, res) => {
    const fileName = DATA_DIR + '/' + getFileName();
    if (process.env.IP_FILTER && req.ip !== process.env.IP_FILTER) {
        res.status('403').send('{ error: \'ip-not-allowed\' }');
    } else {
        const val = Number(req.body);

        if (isNaN(val)) {
            res.status('400').send('{ error: \'not-a-number\' }');
        } else {
            fs.access(DATA_DIR)
                .catch(() => fs.mkdir(DATA_DIR))
                .then(() => writeRangedValToFile(fileName, T_RANGE, val))
                .then(
                    () => res.json({ val }),
                    (err) => res.status(500).json({ error: err.message })
                );
        }
    }
});

app.listen(process.argv[2] || process.env.PORT || 80);
