const http = require('http');
const express = require('express');
const app = express();
const superagent = require('superagent');
var compression = require('compression')
//const async = require('async');
//const bigInt = require("big-integer");
/* const redis = require("redis").createClient({
    "host": "127.0.0.1",
    "port": "6379"
}); */

const httpEndPoints = [
    /* "http://api.fibos.rocks" */
    "http://127.0.0.1:10201"
];
const port = 5002;

var server = http.createServer(app).listen(port, function () { });
console.log('start on:' + port);
server.timeout = 240000;

var rows = [];
var newRows = [];
var nextKey = 0;

app.use(compression());
app.get('/get_table_rows', (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.json({ rows: rows });
});

app.get('/refresh', (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.end("refreshing");
    loop();
});

// progress
//loop();
setInterval(loop, 1000 * 10);
// functions

/**
 * get http endpoint by random
 */
function getEndPoint() {
    let random = Math.floor(Math.random() * httpEndPoints.length);
    return httpEndPoints[random];
}


function loop() {
    getLoop().then(() => {
        rows = newRows;
        newRows = [];
        nextKey = 0;
        console.log("get pixels alive");
        //setTimeout(loop, 3000);
    }).catch(e => {
        console.error(e);
        setTimeout(loop, 1000);
    })
}

function getLoop() {
    return getOnce().then(more => {
        //for local test 
        //return Promise.resolve();
        //
        if (more) {
            nextKey = newRows[newRows.length - 1].row + 1;
            console.log("nextKey:", nextKey);
            return getLoop();
        } else {
            return Promise.resolve();
        }
    }).catch(err => {
        console.error(err);
        console.log("retry");
        return getLoop();
    });
}

function getOnce() {
    return new Promise((resolve, reject) => {
        let httpEndPoint = getEndPoint();

        superagent(httpEndPoint + "/v1/chain/get_table_rows")
            .set('Content-Type', 'application/json')
            .timeout(5000)
            .send({
                "json": true,
                "code": "fibospixeloo",
                "scope": "0",
                "table": "pixels",
                "lower_bound": nextKey,
                "upper_bound": -1,
                "limit": 1000000
            })
            .end(function (err, res) {
                if (err) {
                    let msg = httpEndPoint + " , http error :" + err;
                    console.error(msg);
                    reject(msg);
                } else if (res.statusCode != 200) {
                    let msg = httpEndPoint + " status code :" + res.statusCode
                    console.error(msg);
                    reject(msg);
                } else {
                    let object = JSON.parse(res.text);
                    /* object.rows.forEach(row => {
                        row.pixels.forEach(pixel => {
                            if (pixel.owner == "") {
                                pixel = null;
                            }
                        })
                    }); */
                    newRows = newRows.concat(object.rows);
                    resolve(object.more);
                }
            });
    });
}
