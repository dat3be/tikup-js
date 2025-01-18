class Logger {
    static info(message, data = {}) {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data);
    }

    static error(message, error) {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, {
            message: error.message,
            stack: error.stack
        });
    }

    static warn(message, data = {}) {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data);
    }

    static debug(message, data = {}) {
        if (process.env.NODE_ENV !== 'production') {
            console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, data);
        }
    }

    static transaction(type, data) {
        this.info(`Transaction: ${type}`, data);
    }

    static order(type, data) {
        this.info(`Order: ${type}`, data);
    }
}

module.exports = Logger; 