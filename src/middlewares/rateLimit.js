const Logger = require('../utils/logger');

class RateLimiter {
    constructor() {
        this.requests = new Map();
        this.limit = 20;        // Tăng từ 5 lên 20 requests
        this.window = 30000;    // Giảm từ 60s xuống 30s
    }

    middleware() {
        return async (ctx, next) => {
            const userId = ctx.from.id;
            const now = Date.now();

            // Get user's request history
            const userRequests = this.requests.get(userId) || [];
            
            // Clean old requests
            const recentRequests = userRequests.filter(
                time => now - time < this.window
            );

            if (recentRequests.length >= this.limit) {
                Logger.warn('Rate limit exceeded', { userId });
                await ctx.reply('⚠️ Vui lòng đợi 30 giây rồi thử lại.');
                return;
            }

            // Add current request
            recentRequests.push(now);
            this.requests.set(userId, recentRequests);

            return next();
        };
    }

    // Clean up old data periodically
    startCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [userId, requests] of this.requests.entries()) {
                const validRequests = requests.filter(
                    time => now - time < this.window
                );
                if (validRequests.length === 0) {
                    this.requests.delete(userId);
                } else {
                    this.requests.set(userId, validRequests);
                }
            }
        }, this.window);
    }
}

module.exports = new RateLimiter(); 