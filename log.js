import os from 'os';

/**
 * @author John L. Carveth
 * @name log.js
 * @version 0.1.0
 * @description A dead-simple logging utility that formats log messages
 * and outputs them to a JSON format.
 */
class Logger {
    static LEVELS = {
        INFO : 'info',
        WARNING : 'warning',
        ERROR : 'error',
        FATAL : 'FATAL'
    };

    constructor () {
        this.hostname = os.hostname();
    }

    /**
     * Sends a JSON-formatted log message to STDOUT
     */
    log({message, level = LEVELS.INFO}, data) {
        let date =this.getISOTimestamp();
        let json = {
            'timestamp' : date,
            'level' : level,
            'message' : message,
            'hostname' : this.hostname
        };

        for (line in data) {
            // DO we need to call JSON.stringify() on data[line]?
            // Do we only need ot call it if it's an object?
            // Or let the final stringify call handle it all
            json[line] = data[line];
        }

        console.log(JSON.stringify(json));
    }

    /**
     * Returns an ISO-formatted timestamp to be included with each log message
     */
    getISOTimestamp() {
        return new Date(Date.now()).toISOString();
    }
}

export default Logger;