const NodeCache = require('node-cache');
const Logger = require('./logger');

// Cache với TTL mặc định là 30 phút
const cache = new NodeCache({ stdTTL: 1800 });

class Cache {
    static async set(key, value, ttl = 1800) {
        try {
            return cache.set(key, value, ttl);
        } catch (error) {
            Logger.error('Cache set error:', {
                error: error.message,
                key,
                stack: error.stack
            });
            throw error;
        }
    }

    static async get(key) {
        try {
            return cache.get(key);
        } catch (error) {
            Logger.error('Cache get error:', {
                error: error.message,
                key,
                stack: error.stack
            });
            throw error;
        }
    }

    static async del(key) {
        try {
            return cache.del(key);
        } catch (error) {
            Logger.error('Cache delete error:', {
                error: error.message,
                key,
                stack: error.stack
            });
            throw error;
        }
    }

    static async flush() {
        try {
            return cache.flushAll();
        } catch (error) {
            Logger.error('Cache flush error:', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
}

module.exports = Cache; 