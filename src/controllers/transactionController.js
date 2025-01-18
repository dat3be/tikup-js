const Transaction = require('../models/transaction');
const Commission = require('../models/commission');
const User = require('../models/user');
const Logger = require('../utils/logger');

class TransactionController {
    static async handleDeposit(userId, amount, transactionId) {
        try {
            // 1. Tạo transaction record
            const transaction = await Transaction.create({
                user_id: userId,
                amount: amount,
                transaction_id: transactionId,
                type: 'deposit',
                status: 'completed'
            });

            // 2. Cộng tiền cho user
            await User.updateBalance(userId, amount);

            // 3. Xử lý hoa hồng nếu user được giới thiệu
            const user = await User.findById(userId);
            if (user.referred_by) {
                // Lấy thông tin người giới thiệu
                const referrer = await User.getRankInfo(user.referred_by);
                
                // Tính hoa hồng dựa trên rank
                const commissionAmount = (amount * referrer.commission_rate) / 100;
                
                if (commissionAmount > 0) {
                    // Tạo commission record
                    await Commission.create({
                        user_id: user.referred_by, // Người nhận hoa hồng
                        referral_id: userId, // Người được giới thiệu
                        transaction_id: transaction.id,
                        amount: amount, // Số tiền gốc
                        commission_amount: commissionAmount // Số tiền hoa hồng
                    });

                    // Cộng tiền hoa hồng cho người giới thiệu
                    await User.updateBalance(user.referred_by, commissionAmount);

                    Logger.info(`Commission ${commissionAmount}đ paid to ${user.referred_by} from ${userId}'s deposit`);
                }
            }

            return transaction;

        } catch (error) {
            Logger.error('Deposit handler error:', error);
            throw error;
        }
    }
}

module.exports = TransactionController; 