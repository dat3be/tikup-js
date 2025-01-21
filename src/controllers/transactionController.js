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
            Logger.info('Start processing deposit:', {
                user_id,
                amount,
                tid,
                has_pending: !!pendingTransaction
            });

            // 1. Tìm pending transaction nếu chưa có
            if (!pendingTransaction) {
                Logger.info('Finding pending transaction...', { user_id, amount });
                pendingTransaction = await Transaction.findPending(user_id, amount);
            }

            // 2. Log kết quả tìm pending transaction
            Logger.info('Pending transaction found:', {
                user_id,
                amount,
                tid,
                pending_id: pendingTransaction?.id,
                pending_amount: pendingTransaction?.amount,
                message_id: pendingTransaction?.message_id
            });

            // 3. Kiểm tra pending transaction
            if (!pendingTransaction) {
                Logger.error('No pending transaction found:', { user_id, amount, tid });
                throw new Error('Không tìm thấy giao dịch chờ xử lý');
            }

            // 4. Tìm user đang nạp tiền
            Logger.info('Finding user...', { user_id });
            const user = await User.findById(user_id);
            if (!user) {
                Logger.error('User not found:', { user_id });
                throw new Error('Không tìm thấy người dùng');
            }
            Logger.info('User found:', { 
                user_id,
                username: user.username,
                current_balance: user.balance,
                referred_by: user.referred_by
            });

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
            Logger.info('Updating transaction status...', {
                id: pendingTransaction.id,
                status: 'completed',
                tid: tid
            });

            const transaction = await Transaction.update(pendingTransaction.id, {
                status: 'completed',
                tid: tid,
                bank_name: bankInfo.bank_name,
                bank_account: bankInfo.bank_account
            });

            Logger.info('Transaction updated:', {
                id: transaction.id,
                tid: transaction.tid,
                status: transaction.status
            });

            // 7. Cập nhật số dư người nạp
            Logger.info('Updating user balance...', {
                user_id,
                old_balance: user.balance,
                deposit_amount: amount
            });

            const updatedUser = await User.updateBalance(user_id, amount);

            Logger.info('User balance updated:', {
                user_id,
                old_balance: user.balance,
                new_balance: updatedUser.balance,
                increased_by: amount
            });

            // 8. Cập nhật tin nhắn giao dịch
            if (pendingTransaction.message_id) {
                try {
                    Logger.info('Updating deposit message...', {
                        user_id,
                        message_id: pendingTransaction.message_id
                    });

                    await bot.telegram.editMessageCaption(
                        user_id,
                        pendingTransaction.message_id,
                        null,
                        `✅ THANH TOÁN THÀNH CÔNG\n\n` +
                        `💰 Số tiền: ${formatNumber(amount)}đ\n` +
                        `🏦 Ngân hàng: ${bankInfo.bank_name}\n` +
                        `💳 STK: ${bankInfo.bank_account}\n` +
                        `🔖 Mã GD: ${tid}\n` +
                        `⏱ Thời gian: ${new Date().toLocaleString('vi-VN')}\n\n` +
                        `💵 Số dư hiện tại: ${formatNumber(updatedUser.balance)}đ`,
                        { parse_mode: 'HTML' }
                    );

                    Logger.info('Deposit message updated successfully', {
                        user_id,
                        message_id: pendingTransaction.message_id
                    });
                } catch (editError) {
                    Logger.error('Error updating deposit message:', {
                        error: editError.message,
                        user_id,
                        message_id: pendingTransaction.message_id
                    });
                }
            }

            // 9. Xử lý hoa hồng nếu có người giới thiệu
            if (user.referred_by) {
                try {
                    Logger.info('Found referral:', {
                        user_id,
                        referred_by: user.referred_by,
                        deposit_amount: amount
                    });

                    // Tìm affiliate có aff_code trùng với referred_by
                    const affiliate = await Affiliate.findByAffCode(user.referred_by);
                    if (!affiliate) {
                        Logger.warn('Affiliate not found:', { 
                            aff_code: user.referred_by,
                            user_id 
                        });
                        return { success: true, transaction, user: updatedUser };
                    }

                    Logger.info('Found affiliate:', {
                        aff_code: affiliate.aff_code,
                        user_id: affiliate.user_id,
                        rank: affiliate.rank,
                        commission_rate: affiliate.commission_rate
                    });

                    // Lấy thông tin người giới thiệu
                    const referrer = await User.findById(affiliate.user_id);
                    if (!referrer) {
                        Logger.warn('Referrer not found:', { 
                            user_id: affiliate.user_id,
                            aff_code: affiliate.aff_code 
                        });
                        return { success: true, transaction, user: updatedUser };
                    }

                    Logger.info('Found referrer:', {
                        referrer_id: referrer.user_id,
                        username: referrer.username,
                        current_balance: referrer.balance
                    });

                    // Tính hoa hồng
                    const commission_rate = affiliate.commission_rate || 0.01;
                    const commission_amount = Math.floor(amount * commission_rate);

                    if (commission_amount > 0) {
                        // 1. Lưu thông tin hoa hồng
                        const commission = await Commission.create({
                            user_id: referrer.user_id,
                            referral_id: user_id,
                            transaction_id: transaction.id,
                            commission_amount
                        });

                        Logger.info('Commission created:', {
                            commission_id: commission.id,
                            referrer_id: referrer.user_id,
                            amount: commission_amount,
                            transaction_id: transaction.id
                        });

                        // 2. Cộng hoa hồng vào số dư người giới thiệu
                        const oldBalance = referrer.balance;
                        const updatedReferrer = await User.updateBalance(referrer.user_id, commission_amount);
                        
                        Logger.info('Commission balance updated:', {
                            referrer_id: referrer.user_id,
                            old_balance: oldBalance,
                            commission_amount,
                            new_balance: updatedReferrer.balance
                        });

                        // 3. Gửi thông báo cho người giới thiệu
                        try {
                            await bot.telegram.sendMessage(
                                referrer.user_id,
                                `💎 NHẬN HOA HỒNG\n\n` +
                                `💰 Số tiền: ${formatNumber(commission_amount)}đ\n` +
                                `👤 Từ user: @${user.username}\n` +
                                `💵 Giao dịch: ${formatNumber(amount)}đ\n` +
                                `📊 Tỷ lệ: ${(commission_rate * 100).toFixed(1)}%\n` +
                                `🏆 Hạng: ${affiliate.rank || 'Cơ bản'}\n\n` +
                                `💵 Số dư hiện tại: ${formatNumber(updatedReferrer.balance)}đ`,
                                { parse_mode: 'HTML' }
                            );

                            Logger.info('Commission notification sent:', {
                                referrer_id: referrer.user_id,
                                commission_amount,
                                message_sent: true
                            });
                        } catch (notifyError) {
                            Logger.error('Error sending commission notification:', {
                                error: notifyError.message,
                                referrer_id: referrer.user_id,
                                username: referrer.username
                            });
                        }
                    } else {
                        Logger.info('Commission amount too small:', {
                            amount,
                            commission_rate,
                            commission_amount
                        });
                    }
                } catch (commissionError) {
                    Logger.error('Error processing commission:', {
                        error: commissionError.message,
                        user_id,
                        referrer: user.referred_by,
                        stack: commissionError.stack
                    });
                }
            }

            Logger.info('Deposit process completed successfully:', {
                user_id,
                transaction_id: transaction.id,
                final_balance: updatedUser.balance
            });

            return {
                success: true,
                transaction,
                user: updatedUser
            };

        } catch (error) {
            Logger.error('Deposit process failed:', {
                error: error.message,
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