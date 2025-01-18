const User = require('../models/user');
const Order = require('../models/order');
const { getMainMenuKeyboard } = require('../keyboards/mainMenu');
const Affiliate = require('../models/affiliate');

class UserController {
    static async handleStart(ctx) {
        try {
            const userId = ctx.from.id;
            const username = ctx.from.username;

            // Create or update user
            await User.create(userId, username);

            await ctx.reply(
                `👋 Chào mừng @${username} đến với dịch vụ của chúng tôi!\n\n` +
                `💡 Vui lòng sử dụng menu để truy cập các tính năng.`,
                getMainMenuKeyboard()
            );
        } catch (error) {
            console.error('Start handler error:', error);
            await ctx.reply('❌ Có lỗi xảy ra. Vui lòng thử lại sau.');
        }
    }

    static async handleAccount(ctx) {
        try {
            const userId = ctx.from.id;
            const user = await User.findById(userId);

            if (!user) {
                return ctx.reply('❌ Không tìm thấy thông tin tài khoản.');
            }

            await ctx.replyWithHTML(
                `👤 <b>THÔNG TIN TÀI KHOẢN</b>\n\n` +
                `🆔 ID: <code>${user.user_id}</code>\n` +
                `👤 Username: @${user.username}\n` +
                `💰 Số dư: ${user.balance?.toLocaleString() || 0}đ`
            );
        } catch (error) {
            console.error('Account handler error:', error);
            await ctx.reply('❌ Có lỗi xảy ra khi lấy thông tin tài khoản.');
        }
    }

    static async handleBag(ctx) {
        try {
            const userId = ctx.from.id;
            const orders = await Order.getRecentOrders(userId, 5);

            if (orders.length === 0) {
                return ctx.reply('📝 Bạn chưa có đơn hàng nào.');
            }

            let message = '🎒 <b>ĐƠN HÀNG GẦN ĐÂY</b>\n\n';
            for (const order of orders) {
                message += `🆔 #${order.api_order_id}\n` +
                          `📝 Dịch vụ: ${order.service_type}\n` +
                          `👥 Số lượng: ${order.quantity.toLocaleString()}\n` +
                          `💰 Tổng tiền: ${order.total_cost.toLocaleString()}đ\n` +
                          `⌛️ Trạng thái: ${order.status}\n\n`;
            }

            await ctx.replyWithHTML(message);
        } catch (error) {
            console.error('Bag handler error:', error);
            await ctx.reply('❌ Có lỗi xảy ra khi lấy thông tin túi.');
        }
    }

    static async showProfile(ctx) {
        try {
            const rankInfo = await User.getRankInfo(ctx.from.id);
            
            const message = `👤 <b>THÔNG TIN TÀI KHOẢN</b>\n\n` +
                          `🆔 ID: ${rankInfo.user_id}\n` +
                          `👤 Username: @${ctx.from.username}\n` +
                          `💰 Số dư: ${rankInfo.balance?.toLocaleString() || 0}đ\n\n` +
                          `🎖 Cấp độ: ${rankInfo.rank}\n` +
                          `👥 Số người giới thiệu: ${rankInfo.current_referrals || 0}\n` +
                          `💎 Tỷ lệ hoa hồng: ${rankInfo.commission_rate || 0}%\n` +
                          `💰 Tổng hoa hồng: ${rankInfo.total_commission?.toLocaleString() || 0}đ`;

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔗 Chương trình giới thiệu', callback_data: 'show_referral' }]
                    ]
                }
            };

            await ctx.replyWithHTML(message, keyboard);
        } catch (error) {
            Logger.error('Show profile error:', error);
            await ctx.reply('❌ Có lỗi xảy ra. Vui lòng thử lại sau.');
        }
    }
}

module.exports = UserController; 