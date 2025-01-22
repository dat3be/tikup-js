const User = require('../models/user');
const Order = require('../models/order');
const { getMainMenuKeyboard } = require('../keyboards/mainMenu');
const Affiliate = require('../models/affiliate');
const Logger = require('../utils/logger');
const MainMenu = require('../keyboards/mainMenu');

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
            const user = await User.findByUserId(userId);
            
            if (!user) {
                return ctx.reply('❌ Không tìm thấy thông tin người dùng');
            }

            // Lấy số dư và đơn hàng
            const balance = user.balance || 0;
            const orders = await Order.findByUserId(userId);

            let message = '🎒 MY BAG\n\n';
            message += `💰 Số dư: ${balance.toLocaleString()}đ\n`;
            message += `📦 Tổng đơn: ${orders.length}\n\n`;

            if (orders && orders.length > 0) {
                message += '📋 DANH SÁCH ĐƠN HÀNG\n\n';

                for (const order of orders) {
                    // Emoji theo trạng thái
                    const statusEmoji = {
                        'pending': '⏳',
                        'processing': '⚡',
                        'completed': '✅',
                        'canceled': '❌',
                        'error': '⚠️'
                    }[order.status] || '❓';

                    // Format thời gian
                    const orderDate = new Date(order.created_at)
                        .toLocaleString('vi-VN', { 
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                        });

                    message += `${statusEmoji} Đơn #${order.api_order_id}\n`;
                    message += `⏰ ${orderDate}\n`;
                    message += `🔗 ${order.service_name}\n`;
                    message += `📌 ${order.link}\n`;
                    message += `👥 SL: ${order.quantity.toLocaleString()}\n`;
                    message += `💵 Giá: ${order.price_per_unit}đ\n`;
                    message += `💰 Tổng: ${order.total_price.toLocaleString()}đ\n`;
                    
                    // Thêm ghi chú nếu có
                    if (order.note) {
                        message += `📝 Ghi chú: ${order.note}\n`;
                    }
                    
                    message += `\n`;
                }

                // Thêm chú thích trạng thái
                message += '\n📌 CHÚ THÍCH:\n';
                message += '⏳ Chờ xử lý\n';
                message += '⚡ Đang chạy\n';
                message += '✅ Hoàn thành\n';
                message += '❌ Đã hủy\n';
                message += '⚠️ Lỗi\n\n';

            } else {
                message += '📭 Chưa có đơn hàng nào\n\n';
            }

            await ctx.reply(message);
            
            // Return to main menu
            await ctx.reply(
                '👋 Quay lại menu chính',
                MainMenu.getMainMenuKeyboard()
            );

            Logger.info('Bag viewed:', {
                user_id: userId,
                orders_count: orders.length,
                balance: balance
            });

        } catch (error) {
            Logger.error('Bag handler error:', {
                error: error.message,
                user_id: ctx.from?.id,
                stack: error.stack
            });
            await ctx.reply('❌ Có lỗi xảy ra. Vui lòng thử lại sau.');
            
            // Return to main menu
            await ctx.reply(
                '👋 Quay lại menu chính',
                MainMenu.getMainMenuKeyboard()
            );
        }
    }

    static async handleDeposit(ctx) {
        try {
            await ctx.reply(
                '💰 NẠP TIỀN\n\n' +
                'Chọn mệnh giá muốn nạp:',
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '50,000đ', callback_data: 'deposit:50000' },
                                { text: '100,000đ', callback_data: 'deposit:100000' }
                            ],
                            [
                                { text: '200,000đ', callback_data: 'deposit:200000' },
                                { text: '500,000đ', callback_data: 'deposit:500000' }
                            ]
                        ]
                    }
                }
            );
        } catch (error) {
            Logger.error('Deposit handler error:', error);
            await ctx.reply('❌ Có lỗi xảy ra. Vui lòng thử lại sau.');
        }
    }

    static async handleDepositCallback(ctx, amount) {
        try {
            const userId = ctx.from.id;
            
            // Tạo mã giao dịch
            const transactionId = Date.now().toString();

            Logger.info('Processing deposit:', {
                user_id: userId,
                amount: amount,
                transaction_id: transactionId
            });

            await ctx.editMessageText(
                '💳 THÔNG TIN THANH TOÁN\n\n' +
                `Số tiền: ${parseInt(amount).toLocaleString()}đ\n` +
                `Mã giao dịch: #${transactionId}\n\n` +
                '🏦 Thông tin chuyển khoản:\n' +
                'Ngân hàng: MB Bank\n' +
                'Số tài khoản: 999999999\n' +
                'Tên: NGUYEN VAN A\n' +
                `Nội dung: NAP ${userId}\n\n` +
                '⚠️ Lưu ý:\n' +
                '• Chuyển đúng nội dung để được cộng tiền tự động\n' +
                '• Nếu cần hỗ trợ, liên hệ Admin @admin',
                {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '✅ Đã chuyển khoản', callback_data: `confirm_deposit:${transactionId}` }]
                        ]
                    }
                }
            );

        } catch (error) {
            Logger.error('Deposit callback error:', error);
            await ctx.reply('❌ Có lỗi xảy ra. Vui lòng thử lại sau.');
        }
    }

    static async handleConfirmDeposit(ctx, transactionId) {
        try {
            await ctx.editMessageText(
                '✅ ĐÃ XÁC NHẬN CHUYỂN KHOẢN\n\n' +
                'Hệ thống sẽ kiểm tra và cộng tiền trong vài phút.\n' +
                'Vui lòng kiểm tra số dư sau 5-10 phút.\n\n' +
                '👉 Gửi /bag để xem số dư'
            );

            Logger.info('Deposit confirmed:', {
                user_id: ctx.from.id,
                transaction_id: transactionId
            });

        } catch (error) {
            Logger.error('Confirm deposit error:', error);
            await ctx.reply('❌ Có lỗi xảy ra. Vui lòng thử lại sau.');
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