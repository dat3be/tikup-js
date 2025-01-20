const cron = require('node-cron');
const Transaction = require('../models/transaction');
const bot = require('../config/telegram');
const Logger = require('../utils/logger');
const { formatNumber } = require('../utils/helper');

class SchedulerService {
    constructor() {
        // Chạy mỗi phút
        this.task = cron.schedule('* * * * *', this.checkPendingTransactions.bind(this));
    }

    async checkPendingTransactions() {
        try {
            // Lấy các giao dịch pending
            const transactions = await Transaction.getPendingTransactions();

            for (const tx of transactions) {
                const createdTime = new Date(tx.created_at).getTime();
                const now = new Date().getTime();
                const minutesPassed = Math.floor((now - createdTime) / (1000 * 60));

                // Gửi nhắc nhở sau 5 phút
                if (minutesPassed === 5) {
                    await this.sendReminder(tx);
                }
                // Hủy giao dịch sau 15 phút
                else if (minutesPassed >= 15) {
                    await this.cancelTransaction(tx);
                }
            }
        } catch (error) {
            Logger.error('Scheduler error:', error);
        }
    }

    async sendReminder(transaction) {
        try {
            await bot.telegram.sendMessage(
                transaction.user_id,
                `⏰ <b>Nhắc nhở thanh toán</b>\n\n` +
                `Bạn có một giao dịch nạp tiền đang chờ:\n` +
                `💰 Số tiền: <b>${formatNumber(transaction.amount)}đ</b>\n\n` +
                `Vui lòng hoàn tất thanh toán hoặc hủy giao dịch nếu không còn nhu cầu.`,
                { parse_mode: 'HTML' }
            );

            Logger.info('Sent payment reminder', {
                userId: transaction.user_id,
                transactionId: transaction.id
            });
        } catch (error) {
            Logger.error('Error sending reminder:', error);
        }
    }

    async cancelTransaction(transaction) {
        try {
            // Cập nhật trạng thái transaction
            await Transaction.update(transaction.id, {
                status: 'cancelled',
                updated_at: new Date()
            });

            // Cập nhật message gốc
            if (transaction.message_id) {
                try {
                    await bot.telegram.editMessageCaption(
                        transaction.user_id,
                        transaction.message_id,
                        null,
                        `❌ <b>GIAO DỊCH ĐÃ HẾT HẠN</b>\n\n` +
                        `⏱ Thời gian: ${new Date().toLocaleString('vi-VN')}`,
                        {
                            parse_mode: 'HTML',
                            reply_markup: { inline_keyboard: [] }
                        }
                    );
                } catch (editError) {
                    Logger.error('Error editing expired message:', editError);
                }
            }

            // Thông báo cho user
            await bot.telegram.sendMessage(
                transaction.user_id,
                `⏰ <b>Giao dịch đã hết hạn</b>\n\n` +
                `Giao dịch nạp <b>${formatNumber(transaction.amount)}đ</b> đã bị hủy do quá thời gian thanh toán.\n` +
                `Vui lòng tạo giao dịch mới nếu bạn vẫn muốn nạp tiền.`,
                { parse_mode: 'HTML' }
            );

            Logger.info('Auto cancelled expired transaction', {
                userId: transaction.user_id,
                transactionId: transaction.id
            });
        } catch (error) {
            Logger.error('Error auto cancelling transaction:', error);
        }
    }

    start() {
        this.task.start();
        Logger.info('Transaction scheduler started');
    }

    stop() {
        this.task.stop();
        Logger.info('Transaction scheduler stopped');
    }
}

module.exports = new SchedulerService();