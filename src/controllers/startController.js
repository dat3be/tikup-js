const User = require('../models/user');
const Affiliate = require('../models/affiliate');
const Logger = require('../utils/logger');
const MainMenu = require('../keyboards/mainMenu');

class StartController {
    static async handleStart(ctx) {
        try {
            const userId = ctx.from.id.toString();
            const username = ctx.from.username;
            let referredBy = null;

            // Log start command và parameters
            Logger.info(`Start command received from user ${userId} (${username})`);
            Logger.info(`Full message text: ${ctx.message.text}`);
            Logger.info(`Start payload: ${ctx.startPayload}`);

            // Kiểm tra start parameter (mã giới thiệu)
            const startParam = ctx.startPayload;
            if (startParam) {
                Logger.info(`Processing referral code: ${startParam}`);
                const affiliate = await Affiliate.findByAffCode(startParam);
                
                if (affiliate) {
                    Logger.info(`Found affiliate for code ${startParam}:`, affiliate);
                    if (affiliate.user_id !== userId) {
                        referredBy = startParam;
                        Logger.info(`User ${userId} was referred by ${affiliate.user_id} with code ${referredBy}`);
                    } else {
                        Logger.warn(`User ${userId} tried to use their own referral code`);
                    }
                } else {
                    Logger.warn(`No affiliate found for code: ${startParam}`);
                }
            }

            // Kiểm tra xem user đã tồn tại và đã có người giới thiệu chưa
            const existingUser = await User.findById(userId);
            if (existingUser && existingUser.referred_by) {
                Logger.info(`User ${userId} already exists with referrer: ${existingUser.referred_by}`);
                await ctx.reply('Chào mừng quay trở lại!', MainMenu.getMainMenuKeyboard());
                return;
            }

            // Tạo hoặc cập nhật user
            const user = await User.create(userId, username, referredBy);
            Logger.info(`User created/updated:`, user);

            // Tin nhắn chào mừng
            let message = `👋 Chào mừng @${username} đến với dịch vụ của chúng tôi!\n\n`;
            if (user.referred_by) {
                const referrer = await Affiliate.findByAffCode(user.referred_by);
                if (referrer) {
                    const referrerUser = await User.findById(referrer.user_id);
                    message += `🎉 Bạn đã được giới thiệu bởi: @${referrerUser.username}\n\n`;
                }
            }
            message += `💡 Vui lòng sử dụng menu để truy cập các tính năng.`;

            await ctx.reply(message, MainMenu.getMainMenuKeyboard());

            // Cập nhật rank cho người giới thiệu
            if (referredBy) {
                const referrer = await Affiliate.findByAffCode(referredBy);
                if (referrer) {
                    await User.updateRank(referrer.user_id);
                    Logger.info(`Updated rank for referrer ${referrer.user_id}`);
                }
            }

        } catch (error) {
            Logger.error('Start handler error:', error);
            await ctx.reply('❌ Có lỗi xảy ra. Vui lòng thử lại sau.');
        }
    }
}

module.exports = StartController; module.exports = StartController; 
