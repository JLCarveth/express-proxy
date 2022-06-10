/**
 * A simple proxy server to bypass CORS restrictions in the browser
 * 
 * Usage:
 *  - Point your HTTP request at this server at the root url (ex. localhost:3069/)
 *  - Set a 'Target-URL' header pointing to API you want to access
 *  - Set body params, authentication if needed
 */
import fs from 'fs/promises';
import express from 'express';
import request from 'request'
import bodyParser from 'body-parser';
import {performance} from 'perf_hooks';

import dotenv from 'dotenv';
dotenv.config();

const app = express();
const LOGGING = (process.env.DO_LOGGING === 'true') ? true : false;
const filepath = (process.env.LOG_FILE !== undefined) ? process.env.LOG_FILE : 'spire-inventory.log';

var myLimit = typeof (process.argv[2]) != 'undefined' ? process.argv[2] : '100kb';
console.log('Using limit: ', myLimit);

if (LOGGING) console.log("Logging enabled, logfile: " + filepath);

function log(message, level) {
    let date = new Date(Date.now()).toISOString();
    let line = `${date} | ${level} | ${message}`;
    fs.appendFile(filepath, line, {
        'flag' : 'a+'
    }, (err) => {
        console.error("ERROR: Cannot write to logfile.\n", JSON.stringify(err));
    });
}

app.use(bodyParser.json({ limit: myLimit }));

app.all('*', function (req, res) {
    const t0 = performance.now();
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, PUT, PATCH, POST, DELETE');
    res.header('Access-Control-Allow-Headers', req.header('access-control-request-headers'));
    if (req.method === 'OPTIONS') {
        // CORS Preflight
        res.send();
    } else {
        var targetURL = req.header('Target-URL'); // Target-URL ie. https://example.com or http://example.com
        if (!targetURL) {
            res.send(500, { error: 'There is no Target-Endpoint header in the request' });
            return;
        }
        /* Log incoming request */
        if (LOGGING) {
            let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            log(
                'Incoming Request:\n' +
                '\tClient Address:\t' + ip +'\n' +
                '\tTarget-URL:\t' + targetURL + '\n' +
                '\tmethod:\t\t' + req.method + '\n' +
                '\tRequest Body:\t' + JSON.stringify(req.body) + '\n' +
                '\tHeaders:\t' + JSON.stringify(req.headers) + '\n',
                'info' // Log Level
            );
        }
        request({ url: targetURL, method: req.method, json: req.body, headers: { 'Authorization': req.header('Authorization') } },
            function (error, response) {
                if (error) {
                    console.error('error: ' + response.statusCode)
                }
                if (LOGGING) {
                    const t1 = performance.now();
                    log(
                        'Request Response' + '\n' +
                        '\tStatus Code:\t' + response.statusCode + '\n' +
                        '\tElapsed Time:\t' + (t1 - t0).toFixed(2) + 'ms' + '\n' +
                        '\tResponse Body:\t' + JSON.stringify(response.body) + '\n',
                        'info' // Log Level
                    );
                }
            }).pipe(res);
    }
});

app.use(express.urlencoded({ extended: false }));
app.set('port', process.env.PORT || 3069);
app.listen(app.get('port'), function () {
    console.log('Proxy server listening on port ' + app.get('port'));
});
