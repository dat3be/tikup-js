const User = require('../models/user');
const Logger = require('../utils/logger');

class AuthMiddleware {
    static async authenticate(ctx, next) {
        try {
            const userId = ctx.from.id;
            const username = ctx.from.username;

            // Check if user exists, if not create new user
            let user = await User.findById(userId);
            if (!user) {
                user = await User.create(userId, username);
                Logger.info('New user created', { userId, username });
            }

            // Attach user to context
            ctx.state.user = user;
            
            return next();
        } catch (error) {
            Logger.error('Authentication error', error);
            await ctx.reply('❌ Có lỗi xảy ra. Vui lòng thử lại sau.');
        }
    }

    static async requireAuth(ctx, next) {
        if (!ctx.state.user) {
            await ctx.reply('⚠️ Vui lòng khởi động lại bot bằng lệnh /start');
            return;
        }
        return next();
    }
}

module.exports = AuthMiddleware; 