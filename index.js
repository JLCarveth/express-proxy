/**
 * A simple proxy server to bypass CORS restrictions in the browser
 * 
 * Usage:
 *  - Point your HTTP request at this server at the root url (ex. localhost:3069/)
 *  - Set a 'Target-URL' header pointing to API you want to access
 *  - Set body params, authentication if needed
 */
import express from 'express';
import request from 'request'
import bodyParser from 'body-parser';
import { performance } from 'perf_hooks';

import dotenv from 'dotenv';
dotenv.config();

const LOGGING = (process.env.DO_LOGGING === 'true') ? true : false;

import logger from '@jlcarveth/log.js';
const Logger = new logger();
const app = express();

process.title = 'eproxy'

var myLimit = typeof (process.env.LIMIT) != 'undefined' ? process.env.LIMIT : '250kb';
Logger.log('Using limit: ' + myLimit);
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
        var targetURL = req.header('Target-URL');
        if (!targetURL) {
            res.send(500, { error: 'There is no Target-URL header in the request' });
            return;
        }
        /* Log incoming request */
        if (LOGGING) {
            let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            let data = {
                "clientAddress": ip,
                "targetURL": targetURL,
                "method": req.method,
                "body": req.body,
                "headers": req.headers
            };
            Logger.log('Inbound request', data);
        }

        request({ url: targetURL, method: req.method, json: req.body, headers: { 'Authorization': req.header('Authorization') } },
            function (error, response) {
                if (error) {
                    console.error('error: ' + response.statusCode)
                }
                if (LOGGING) {
                    const t1 = performance.now();
                    let data = {
                        "statusCode": response.statusCode,
                        "elapsedTime": (t1 - t0).toFixed(2) + 'ms',
                        "response": response.body
                    };

                    Logger.log('Inbound response.', data);
                }
            }).pipe(res);
    }
});

app.use(express.urlencoded({ extended: false }));
app.set('port', process.env.PORT || 3069);
app.listen(app.get('port'), function () {
    Logger.log('Proxy server listening on port ' + app.get('port'));
});
