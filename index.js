const yadisk = require('./yadisk');
const encoder = require('./encoder');
const express = require('express');
const fetch = require('node-fetch');

const STEP = (process.env.STEP || 10) * 1000;

const app = express();
app.use(express.text({ type: () => true }));

const getFileName = (v) => v + (new Date()).toISOString().substr(0, 10);
const getDayStartTs = () => {
    const p = new Date();
    p.setUTCHours(0);
    p.setUTCMinutes(0);
    p.setUTCSeconds(0);
    p.setUTCMilliseconds(0);
    return Math.round(p / 1000);
};

const VARS = ['t', 'v', 'a'];

let current = VARS.reduce((current, v) => {
    current[v] = 0;
    return current;
}, {});

setInterval(() => {
    const stepsFromStartTs = Math.ceil((new Date() - getDayStartTs() * 1000) / STEP);

    VARS.forEach(v => {
        const fn = getFileName(v);
        return yadisk.read(getFileName(v)).then(res => {
            var data = encoder.decode(res);
            if (data.length < stepsFromStartTs) {
                console.warn('adding', stepsFromStartTs - data.length, 'extra steps');
                data.push(...Array.apply([], Array(stepsFromStartTs - data.length)).map(() => data[data.length - 1]));
            }
            data.push(current[v]);
            return data;
        }, err => [...Array.apply([], Array(stepsFromStartTs - 1)).map(() => 0), current[v]]).then(data => {
            return yadisk.save(fn, encoder.encode(data));
        })
    });
}, STEP);

app.post('/d', (req, res) => {
    if (process.env.IP_FILTER && req.ip !== process.env.IP_FILTER) {
        res.status('403').send('{ "error": "ip-not-allowed" }');
    } else {
        let vals = {};

        try {
            vals = JSON.parse(req.body);
            if (typeof vals !== 'object' ) {
                res.status('400').send('{ "error": "not-an-object" }');
            }
            if (Object.keys(vals).some(k => isNaN(vals[k]))) {
                res.status('400').send('{ "error": "not-an-object" }');
            }
        } catch(e) {
            res.status('400').send('{ "error": "not-a-valid-json" }');
        }

        VARS.forEach(v => {
            if (v in vals) {
                current[v] = vals[v];
            }
        });
        res.status(200).json({ok:true});
    }
});

app.get('/d', (req, res) => {
    const ts = getDayStartTs();
    Promise.all(VARS.map(v => yadisk.read(getFileName(v)).then(r => { console.log(r); console.log(encoder.decode(r)); return encoder.decode(r); })))
        .then(data => {
            console.log(data);
            var json = VARS.reduce((json, v, i) => {
                json[v] = data[i];
                return json;
            }, {
                ts,
                delta: STEP
            });

            res
                .set('Access-Control-Allow-Origin', '*')
                .json(json);
        })
        .catch(e => {
            res.send({ ts: 0 });
        });
});

app.get('/', (req, res) => res.send('welcome to istra'));

app.listen(process.argv[2] || process.env.PORT || 80);
