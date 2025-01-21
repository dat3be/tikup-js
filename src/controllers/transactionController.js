const Transaction = require('../models/transaction');
const User = require('../models/user');
const Affiliate = require('../models/affiliate');
const Commission = require('../models/commission');
const Logger = require('../utils/logger');
const bot = require('../config/telegram');
const { formatNumber } = require('../utils/helper');
const { BANK_INFO } = require('../config/constants');

class TransactionController {
    static async handleDeposit(user_id, amount, tid, bankInfo = {}, pendingTransaction = null) {
        try {
            Logger.info('Processing transaction:', {
                user_id,
                amount,
                tid
            });

            // 1. Tìm pending transaction nếu chưa có
            if (!pendingTransaction) {
                pendingTransaction = await Transaction.findPending(user_id, amount);
            }

            // 2. Log kết quả tìm pending transaction
            Logger.info('Pending transaction status:', {
                user_id,
                amount,
                tid,
                pending_found: !!pendingTransaction,
                pending_id: pendingTransaction?.id,
                pending_amount: pendingTransaction?.amount
            });

            // 3. Kiểm tra pending transaction
            if (!pendingTransaction) {
                const error = new Error('Không tìm thấy giao dịch chờ xử lý');
                error.details = {
                    user_id,
                    amount,
                    tid
                };
                throw error;
            }

            // 4. Tìm user đang nạp tiền
            const user = await User.findById(user_id);
            if (!user) {
                Logger.error('User not found:', { user_id });
                throw new Error('Không tìm thấy người dùng');
            }

            // 5. Kiểm tra số tiền khớp với pending transaction
            if (Number(amount) !== Number(pendingTransaction.amount)) {
                Logger.error('Amount mismatch:', {
                    expected: pendingTransaction.amount,
                    received: amount,
                    user_id
                });
                throw new Error('Số tiền không khớp với giao dịch chờ');
            }

            // 6. Cập nhật trạng thái giao dịch
            Logger.info('Updating transaction status:', {
                id: pendingTransaction.id,
                status: 'completed',
                tid: tid,
                bank_info: bankInfo
            });

            const transaction = await Transaction.update(pendingTransaction.id, {
                status: 'completed',
                tid: tid,
                bank_info: bankInfo
            });

            if (!transaction) {
                Logger.error('Failed to update transaction:', {
                    id: pendingTransaction.id,
                    tid: tid
                });
                throw new Error('Không thể cập nhật giao dịch');
            }

            Logger.info('Transaction updated successfully:', {
                id: transaction.id,
                tid: transaction.tid,
                status: transaction.status
            });

            // 7. Cập nhật số dư người nạp
            const updatedUser = await User.updateBalance(user_id, amount);

            // 8. Cập nhật tin nhắn giao dịch
            if (pendingTransaction.message_id) {
                try {
                    await bot.telegram.editMessageCaption(
                        user_id,
                        pendingTransaction.message_id,
                        null,
                        `✅ THANH TOÁN THÀNH CÔNG\n\n` +
                        `💰 Số tiền: ${formatNumber(amount)}đ\n` +
                        `🏦 Ngân hàng: ${bankInfo.bank_name || BANK_INFO.name}\n` +
                        `💳 STK: ${bankInfo.bank_account || BANK_INFO.account}\n` +
                        `🔖 Mã GD: ${tid}\n` +
                        `⏱ Thời gian: ${new Date().toLocaleString('vi-VN')}\n\n` +
                        `💵 Số dư hiện tại: ${formatNumber(updatedUser.balance)}đ`,
                        { parse_mode: 'HTML' }
                    );
                } catch (editError) {
                    Logger.error('Error editing message:', {
                        error: editError,
                        user_id,
                        message_id: pendingTransaction.message_id
                    });
                }
            }

            // 9. Xử lý hoa hồng nếu có người giới thiệu
            if (user.referred_by) {
                try {
                    // Tìm affiliate có aff_code trùng với referred_by
                    const affiliate = await Affiliate.findByAffCode(user.referred_by);
                    if (!affiliate) {
                        Logger.warn('Affiliate not found:', { aff_code: user.referred_by });
                        return { success: true, transaction, user: updatedUser };
                    }

                    // Lấy thông tin người giới thiệu
                    const referrer = await User.findById(affiliate.user_id);
                    if (!referrer) {
                        Logger.warn('Referrer not found:', { user_id: affiliate.user_id });
                        return { success: true, transaction, user: updatedUser };
                    }

                    // Lấy commission_rate từ bảng affiliates dựa vào rank
                    const commission_rate = affiliate.commission_rate || 0.01;
                    const commission_amount = Math.floor(amount * commission_rate);

                    if (commission_amount > 0) {
                        // Lưu thông tin hoa hồng
                        const commission = await Commission.create({
                            user_id: referrer.user_id,
                            referral_id: user_id,
                            transaction_id: transaction.id,
                            commission_amount
                        });

                        // Cộng hoa hồng vào số dư người giới thiệu
                        await User.updateBalance(referrer.user_id, commission_amount);

                        // Gửi thông báo cho người giới thiệu
                        await bot.telegram.sendMessage(
                            referrer.user_id,
                            `💎 NHẬN HOA HỒNG\n\n` +
                            `💰 Số tiền: ${formatNumber(commission_amount)}đ\n` +
                            `👤 Từ user: @${user.username}\n` +
                            `💵 Giao dịch: ${formatNumber(amount)}đ\n` +
                            `📊 Tỷ lệ: ${(commission_rate * 100).toFixed(1)}%\n` +
                            `🏆 Hạng: ${affiliate.rank || 'Cơ bản'}`,
                            { parse_mode: 'HTML' }
                        );
                    }
                } catch (commissionError) {
                    Logger.error('Error processing commission:', commissionError);
                }
            }

            return {
                success: true,
                transaction,
                user: updatedUser
            };

        } catch (error) {
            // Log error với đầy đủ thông tin
            Logger.error('Deposit error:', {
                message: error.message,
                details: error.details || {},
                user_id,
                amount,
                tid,
                stack: error.stack
            });
            throw error;
        }
    }
}

module.exports = TransactionController; 