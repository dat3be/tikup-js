const Logger = require('../utils/logger');
const Affiliate = require('../models/affiliate');

class ReferralController {
    static async handleReferral(ctx) {
        try {
            const userId = ctx.from.id.toString();
            Logger.info(`Handling referral request for user ${userId}`);

            // Kiểm tra affiliate hiện tại
            const affiliate = await Affiliate.findByUserId(userId);
            if (affiliate) {
                const message = `📊 Thông tin giới thiệu của bạn:\n\n` +
                            `🔗 Link giới thiệu:\n${affiliate.aff_link}\n\n` +
                            `💰 Hoa hồng hiện tại: ${affiliate.commission.toLocaleString()}đ\n` +
                            `👥 Số người giới thiệu: ${affiliate.total_referrals}\n` +
                            `📊 Tổng hoa hồng: ${affiliate.total_commission.toLocaleString()}đ`;
                
                await ctx.reply(message);
                return;
            }

            // Hiển thị lời chào và nút Có/Không nếu chưa có affiliate
            const welcomeMessage = '👋 Chào mừng bạn đến với Chương trình Giới thiệu!\n\n' +
                                 'Bạn có muốn kích hoạt tính năng này không?\n\n' +
                                 'ℹ️ Sau khi kích hoạt, bạn có thể:\n' +
                                 '• Nhận hoa hồng khi giới thiệu người dùng mới\n' +
                                 '• Tự động nhận % từ giao dịch của người được giới thiệu\n' +
                                 '• Rút tiền hoa hồng về tài khoản ngân hàng';
            
            await ctx.reply(welcomeMessage, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '✅ Có', callback_data: 'activate_referral' },
                            { text: '❌ Không', callback_data: 'cancel_referral' }
                        ]
                    ]
                }
            });

        } catch (error) {
            Logger.error('Referral handler error:', error);
            await ctx.reply('❌ Có lỗi xảy ra. Vui lòng thử lại sau.');
        }
    }

    static async handleActivation(ctx) {
        try {
            const userId = ctx.from.id.toString();

            // Kiểm tra xem user đã có affiliate chưa
            const existingAffiliate = await Affiliate.findByUserId(userId);
            if (existingAffiliate) {
                await ctx.editMessageText('❌ Bạn đã kích hoạt tính năng giới thiệu rồi.');
                return;
            }

            // Tạo mã giới thiệu độc nhất
            let affCode;
            let isUnique = false;
            while (!isUnique) {
                affCode = this.generateAffCode();
                const existing = await Affiliate.findByAffCode(affCode);
                if (!existing) {
                    isUnique = true;
                }
            }

            // Tạo link giới thiệu
            const affLink = `https://t.me/tikupprobot?start=${affCode}`;

            // Tạo affiliate mới trong database
            const newAffiliate = await Affiliate.create({
                user_id: userId,
                aff_code: affCode,
                aff_link: affLink,
                commission: 0,
                total_commission: 0,
                total_referrals: 0,
                commission_rate: this.getCommissionRate(),
                status: 'active'
            });

            Logger.info(`Created new affiliate for user ${userId}:`, newAffiliate);

            // Thông báo thành công và hướng dẫn
            const message = `✅ Kích hoạt tính năng giới thiệu thành công!\n\n` +
                          `🔗 Link giới thiệu của bạn:\n${affLink}\n\n` +
                          `💰 Chính sách hoa hồng:\n` +
                          `• Nhận ngay ${this.getCommissionRate()}% từ giá trị nạp tiền\n` +
                          `• Không giới hạn số lượng giới thiệu\n` +
                          `• Rút tiền về tài khoản ngân hàng 24/7\n\n` +
                          `💡 Vào 👫 Referral để xem thông tin chi tiết và quản lý`;

            await ctx.editMessageText(message);

        } catch (error) {
            Logger.error('Activation error:', error);
            await ctx.editMessageText('❌ Có lỗi xảy ra khi kích hoạt. Vui lòng thử lại sau.');
        }
    }

    static async handleCancel(ctx) {
        try {
            await ctx.editMessageText('🚫 Đã hủy kích hoạt tính năng giới thiệu');
        } catch (error) {
            Logger.error('Cancel handler error:', error);
            await ctx.reply('❌ Có lỗi xảy ra. Vui lòng thử lại sau.');
        }
    }

    static generateAffCode(length = 6) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < length; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    static getCommissionRate() {
        return 5;
    }
}

module.exports = ReferralController;