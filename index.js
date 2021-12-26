const yadisk = require('./yadisk');
const express = require('express');
// const yandexSession = require('./yandex-login')(process.env.YANDEX_LOGIN, process.env.YANDEX_PASSWORD);
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

const DEVICES = {
    'va': process.env.YANDEX_HOME_DEVICE_ID
};
const VARS = ['t', 'h', 'v', 'a', 'i', 'd'];

let current = VARS.reduce((current, v) => {
    current[v] = 0;
    return current;
}, {});

setInterval(() => {
    const stepsFromStartTs = Math.ceil((new Date() - getDayStartTs() * 1000) / STEP);

    VARS.forEach(v => {
        const fn = getFileName(v);
        return yadisk.read(getFileName(v)).then(res => {
            var data = JSON.parse(res);
            if (data.length < stepsFromStartTs) {
                data.push(...Array.apply([], Array(stepsFromStartTs - data.length)).map(() => data[data.length - 1]));
            }
            data.push(current[v]);
            return data;
        }, err => [...Array.apply([], Array(stepsFromStartTs - 1)).map(() => 0), current[v]]).then(data => {
            return yadisk.save(fn, JSON.stringify(data));
        })
    });
}, STEP);

/*
setTimeout(() => {
    setInterval(() => {
        yandexSession.then(session => {
            Object.keys(DEVICES).forEach(valueLetters => {
                console.log('getting voltage and amperage for', valueLetters, DEVICES[valueLetters]);
                fetch('https://iot.quasar.yandex.ru/m/user/devices/' + DEVICES[valueLetters], { headers: { 'Cookie': 'Session_id=' + yandexSession } })
                    .then(res => res.json())
                    .then(json => ['voltage', 'amperage'].map(key => json.properties.find(property => property.parameters.instance === key).state.value))
                    .then(([voltage, amperage]) => {
                        console.log('got voltage and amperage');
                        current[valueLetters[0]] = voltage;
                        current[valueLetters[1]] = amperage;
                    })
                    .catch(e => {
                        console.log('Error while getting yandex home:', e);
                        current[valueLetters[0]] = 0;
                        current[valueLetters[1]] = 0;
                    });
            });
        });
    }, STEP);
}, STEP / 2);
*/

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
    Promise.all(VARS.map(v => yadisk.read(getFileName(v)).then(JSON.parse)))
        .then(data => {
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

app.get('/d/:date', (req, res) => {
    const date = req.params.date;
    const ts = +(new Date(date));
    if (isNaN(ts)) {
        res
            .set('Access-Control-Allow-Origin', '*')
            .status(400)
            .send('{"error":"invalid-date-format"}');
    }
    Promise.all(VARS.map(v => yadisk.read(v + date).then(JSON.parse)))
        .then(data => {
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

const REC_INTERVALS = {};

app.get('/rec/:camport/:folder', (req, res) => {
    if (!REC_INTERVALS[req.params.camport]) {
        yadisk.mkdir('rec/' + req.params.folder).then(() => {
            let c = 0;
            REC_INTERVALS[req.params.camport] = setInterval(() => {
                yadisk.upload(
                    'rec/' + req.params.folder + '/pic_' + (c++) + '.jpg',
                    'http://' + process.env.IP + ':' + req.params.camport + '/snapshot.cgi?user=admin&pwd=' + req.query.pwd + '&res=0'
                );
            }, req.query.interval || 3000);
            res.send({ 
                ok: 'started',
                interval: REC_INTERVALS[req.params.camport],
                path: 'http://' + process.env.IP + ':' + req.params.camport + '/snapshot.cgi?user=admin&pwd=' + req.query.pwd + '&res=0'
            });
        });
    } else {
        res.send({ 
            err: 'already recording', 
            interval: REC_INTERVALS[req.params.camport]
        });
    }
});

app.get('/stop/:camport', (req, res) => {
    if (REC_INTERVALS[req.params.camport]) {
        clearInterval(REC_INTERVALS[req.params.camport]);
        delete REC_INTERVALS[req.params.camport];
        res.send({ ok: 'stopped' });
    } else {
        res.send({ err: 'was not recording' });
    }
});

app.get('/', (req, res) => res.send('welcome to istra'));

app.listen(process.argv[2] || process.env.PORT || 80);
