const User = require('../models/user');
const Logger = require('../utils/logger');
const MainMenu = require('../keyboards/mainMenu');

class StartController {
    static async handleStart(ctx) {
        try {
            const user_id = ctx.from.id.toString();
            const username = ctx.from.username;
            
            // Parse referred_by từ command text: /start QAZ0MH
            const commandText = ctx.message?.text || '';
            const parts = commandText.split(' ');
            const referred_by = parts.length > 1 ? parts[1] : null;

            Logger.info('Start command received:', {
                user_id,
                username,
                command_text: commandText,
                parsed_referred_by: referred_by
            });

            // Kiểm tra user đã tồn tại chưa
            const existingUser = await User.findById(user_id);
            
            // Nếu là user đã tồn tại và chưa có referred_by
            if (existingUser && !existingUser.referred_by && referred_by) {
                Logger.info('Updating existing user with referral:', {
                    user_id,
                    username,
                    referred_by
                });

                // Cập nhật referred_by cho user
                const updatedUser = await User.update(user_id, {
                    referred_by: referred_by
                });

                Logger.info('User updated with referral:', {
                    user_id: updatedUser.user_id,
                    username: updatedUser.username,
                    referred_by: updatedUser.referred_by
                });

                const message = `👋 Chào mừng @${username}!\n\n` +
                              `✅ Bạn được giới thiệu bởi mã: ${referred_by}\n\n` +
                              `💡 Vui lòng sử dụng menu để truy cập các tính năng.`;

                await ctx.reply(message, MainMenu.getMainMenuKeyboard());
                return;
            }

            // User đã tồn tại và đã có referred_by
            if (existingUser?.referred_by) {
                Logger.info('User already has referral:', {
                    user_id,
                    username,
                    current_referred_by: existingUser.referred_by
                });

                const message = `👋 Chào mừng quay lại, @${username}!\n\n` +
                              `💡 Vui lòng sử dụng menu để truy cập các tính năng.`;

                await ctx.reply(message, MainMenu.getMainMenuKeyboard());
                return;
            }

            // User mới
            const user = await User.create(user_id, username, referred_by);
            Logger.info('New user created:', {
                user_id: user.user_id,
                username: user.username,
                referred_by: user.referred_by
            });

            const message = `👋 Chào mừng @${username}!\n\n` +
                          (referred_by ? `✅ Bạn được giới thiệu bởi mã: ${referred_by}\n\n` : '') +
                          `💡 Vui lòng sử dụng menu để truy cập các tính năng.`;

            await ctx.reply(message, MainMenu.getMainMenuKeyboard());

        } catch (error) {
            Logger.error('Start handler error:', {
                error: error.message,
                user_id: ctx.from?.id,
                command: ctx.message?.text
            });
            await ctx.reply('❌ Có lỗi xảy ra. Vui lòng thử lại sau.');
        }
    }
}

module.exports = StartController; 
