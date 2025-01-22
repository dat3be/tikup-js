const Affiliate = require('../models/affiliate');
const Logger = require('../utils/logger');
const { AFFILIATE_RANKS } = require('../config/constants');
const MainMenu = require('../keyboards/mainMenu');

class ReferralController {
    static async handleReferral(ctx) {
        try {
            const userId = ctx.from.id.toString();
            Logger.info('Handling referral request:', { user_id: userId });

            // Kiểm tra affiliate hiện tại
            const affiliate = await Affiliate.findByUserId(userId);
            if (affiliate) {
                const nextRank = ReferralController.getNextRank(affiliate);
                const message = `📊 THÔNG TIN GIỚI THIỆU\n\n` +
                    `🏆 Hạng: ${affiliate.rank}\n` +
                    `💰 Tỷ lệ hoa hồng: ${(affiliate.commission_rate * 100).toFixed(1)}%\n` +
                    `👥 Số người giới thiệu: ${affiliate.total_referrals}\n` +
                    `💵 Tổng hoa hồng: ${affiliate.total_commission.toLocaleString()}đ\n\n` +
                    `🔗 Link giới thiệu:\nhttps://t.me/tikupprobot?start=${affiliate.aff_code}\n\n` +
                    (nextRank ? 
                        `📈 Thăng hạng tiếp theo:\n` +
                        `• ${nextRank.name}: ${(nextRank.commission_rate * 100).toFixed(1)}%\n` +
                        `• Cần thêm ${nextRank.required_referrals - affiliate.total_referrals} người giới thiệu` 
                        : `🎉 Chúc mừng! Bạn đã đạt hạng cao nhất`);
                
                await ctx.reply(message, { parse_mode: 'HTML' });
                
                // Return to main menu
                await ctx.reply(
                    '👋 Quay lại menu chính',
                    MainMenu.getMainMenuKeyboard()
                );
                return;
            }

            // Hiển thị lời chào và nút Có/Không nếu chưa có affiliate
            const welcomeMessage = '👋 CHƯƠNG TRÌNH GIỚI THIỆU\n\n' +
                '💎 Hệ thống hạng và hoa hồng:\n' +
                `• ${AFFILIATE_RANKS.BRONZE.name}: ${(AFFILIATE_RANKS.BRONZE.commission_rate * 100).toFixed(1)}% (0 người)\n` +
                `• ${AFFILIATE_RANKS.SILVER.name}: ${(AFFILIATE_RANKS.SILVER.commission_rate * 100).toFixed(1)}% (${AFFILIATE_RANKS.SILVER.required_referrals} người)\n` +
                `• ${AFFILIATE_RANKS.GOLD.name}: ${(AFFILIATE_RANKS.GOLD.commission_rate * 100).toFixed(1)}% (${AFFILIATE_RANKS.GOLD.required_referrals} người)\n` +
                `• ${AFFILIATE_RANKS.PLATINUM.name}: ${(AFFILIATE_RANKS.PLATINUM.commission_rate * 100).toFixed(1)}% (${AFFILIATE_RANKS.PLATINUM.required_referrals} người)\n` +
                `• ${AFFILIATE_RANKS.DIAMOND.name}: ${(AFFILIATE_RANKS.DIAMOND.commission_rate * 100).toFixed(1)}% (${AFFILIATE_RANKS.DIAMOND.required_referrals} người)\n\n` +
                '💡 Bạn có muốn tham gia không?';
            
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
            Logger.error('Referral handler error:', {
                error: error.message,
                user_id: ctx.from.id,
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

            // Tạo affiliate mới với rank Bronze
            const newAffiliate = await Affiliate.create({
                user_id: userId,
                aff_code: affCode,
                aff_link: affLink
            });

            Logger.info('Created new affiliate:', {
                user_id: userId,
                aff_code: affCode,
                aff_link: affLink,
                rank: newAffiliate.rank
            });

            // Thông báo thành công
            const message = `✅ KÍCH HOẠT THÀNH CÔNG!\n\n` +
                `🏆 Hạng hiện tại: ${newAffiliate.rank}\n` +
                `💰 Tỷ lệ hoa hồng: ${(newAffiliate.commission_rate * 100).toFixed(1)}%\n\n` +
                `🔗 Link giới thiệu của bạn:\n${affLink}\n\n` +
                `📈 Thăng hạng tiếp theo:\n` +
                `• ${AFFILIATE_RANKS.SILVER.name}: ${(AFFILIATE_RANKS.SILVER.commission_rate * 100).toFixed(1)}%\n` +
                `• Cần ${AFFILIATE_RANKS.SILVER.required_referrals} người giới thiệu`;

            await ctx.editMessageText(message, { parse_mode: 'HTML' });

        } catch (error) {
            Logger.error('Activation error:', {
                error: error.message,
                user_id: ctx.from.id,
                stack: error.stack
            });
            await ctx.editMessageText('❌ Có lỗi xảy ra khi kích hoạt. Vui lòng thử lại sau.');
        }
    }

    static getNextRank(affiliate) {
        const ranks = [
            AFFILIATE_RANKS.BRONZE,
            AFFILIATE_RANKS.SILVER,
            AFFILIATE_RANKS.GOLD,
            AFFILIATE_RANKS.PLATINUM,
            AFFILIATE_RANKS.DIAMOND
        ];

        const currentRankIndex = ranks.findIndex(r => r.name === affiliate.rank);
        if (currentRankIndex < ranks.length - 1) {
            return ranks[currentRankIndex + 1];
        }
        return null;
    }

    static generateAffCode(length = 6) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < length; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
}

module.exports = ReferralController;