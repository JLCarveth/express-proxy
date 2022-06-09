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

const app = express();
const LOGGING = (process.env.DO_LOGGING === 'true') ? true : false;
const filepath = (process.env.LOG_FILE !== undefined) ? process.env.LOG_FILE : 'spire-inventory.log';

var myLimit = typeof (process.argv[2]) != 'undefined' ? process.argv[2] : '100kb';
console.log('Using limit: ', myLimit);

if (LOGGING) console.log("Logging enabled, logfile: " + filepath);

function log(message) {
    fs.appendFile(filepath, message, {
        'flag' : 'a+'
    }, (error) => {
        console.error("ERROR: Cannot write to logfile.");
        console.error(JSON.stringify(error));
    });
}

app.use(bodyParser.json({ limit: myLimit }));

app.all('*', function (req, res, next) {
    // Set CORS headers: allow all origins, methods, and headers: you may want to lock this down in a production environment
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
        if (LOGGING) {
            log(
                'Target-URL:\t' + targetURL + '\n' +
                'method:\t\t' + req.method + '\n' +
                'Request Body:\t' + JSON.stringify(req.body) + '\n' +
                'Headers:\t' + JSON.stringify(req.headers) + '\n' +
                '*'.repeat(80) + '\n'
            );
        }
        request({ url: targetURL, method: req.method, json: req.body, headers: { 'Authorization': req.header('Authorization') } },
            function (error, response, body) {
                if (error) {
                    console.error('error: ' + response.statusCode)
                }
            }).pipe(res);
    }
});

app.use(express.urlencoded({ extended: false }));
app.set('port', process.env.PORT || 3069);
app.listen(app.get('port'), function () {
    console.log('Proxy server listening on port ' + app.get('port'));
});
