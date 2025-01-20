const Transaction = require('../models/transaction');
const User = require('../models/user');
const Logger = require('../utils/logger');
const bot = require('../config/telegram');
const { formatNumber } = require('../utils/helper');

class TransactionController {
    static async handleDeposit(userId, amount, tid, bankInfo = {}) {
        try {
            // Kiểm tra giao dịch đã tồn tại
            const existingTransaction = await Transaction.findByTid(tid);
            if (existingTransaction) {
                Logger.warn('Duplicate transaction:', { tid });
                return { success: false, message: 'Duplicate transaction' };
            }

            // Tìm giao dịch pending của user với số tiền tương ứng
            const pendingTransaction = await Transaction.findPendingDeposit(userId, amount);
            
            // Cập nhật số dư user
            const user = await User.updateBalance(userId, amount);
            if (!user) {
                throw new Error('User not found');
            }

            // Nếu tìm thấy giao dịch pending, cập nhật message cũ
            if (pendingTransaction?.message_id) {
                try {
                    await bot.telegram.editMessageCaption(
                        userId,
                        pendingTransaction.message_id,
                        null,
                        `✅ <b>THANH TOÁN THÀNH CÔNG</b>\n\n` +
                        `💰 Số tiền: <b>${formatNumber(amount)}đ</b>\n` +
                        `🏦 Ngân hàng: <b>${bankInfo.bank_name || BANK_INFO.name}</b>\n` +
                        `💳 STK: <b>${bankInfo.bank_account || BANK_INFO.account}</b>\n` +
                        `🔖 Mã GD: <code>${tid}</code>\n` +
                        `⏱ Thời gian: ${new Date().toLocaleString('vi-VN')}\n\n` +
                        `💵 Số dư hiện tại: <b>${formatNumber(user.balance)}đ</b>`,
                    );

                    // Cập nhật trạng thái transaction
                    await Transaction.update(pendingTransaction.id, {
                        status: 'completed',
                        tid: tid,
                        bank_name: bankInfo.bank_name,
                        bank_account: bankInfo.bank_account,
                        updated_at: new Date()
                    });

                    Logger.info('Updated transaction message', {
                        userId,
                        transactionId: pendingTransaction.id,
                        messageId: pendingTransaction.message_id
                    });
                } catch (editError) {
                    Logger.error('Error updating transaction message:', editError);
                    // Không throw error vì giao dịch vẫn thành công
                }
            } else {
                // Nếu không tìm thấy giao dịch pending, tạo mới
                await Transaction.create({
                    user_id: userId,
                    amount: amount,
                    type: 'deposit',
                    status: 'completed',
                    tid: tid,
                    bank_name: bankInfo.bank_name,
                    bank_account: bankInfo.bank_account,
                    description: `TIKUP${userId}`
                });
            }

            return {
                success: true,
                transaction: pendingTransaction,
                user
            };

        } catch (error) {
            Logger.error('Error handling deposit:', error);
            throw error;
        }
    }
}

module.exports = TransactionController; 