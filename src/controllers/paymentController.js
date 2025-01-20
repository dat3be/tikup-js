const User = require('../models/user');
const Transaction = require('../models/transaction');
const { BANK_INFO } = require('../config/constants');
const { Markup } = require('telegraf');
const MainMenu = require('../keyboards/mainMenu');
const Logger = require('../utils/logger');
const { formatNumber } = require('../utils/helper');

class PaymentController {

    static TRANSACTION_TYPES = {
        DEPOSIT: 'deposit',
        WITHDRAW: 'withdraw',
        TRANSFER: 'transfer'
    };

    static async handleDeposit(ctx) {
        try {
            const userId = ctx.from.id;
            const user = await User.findById(userId);

            const message = `💰 <b>NẠP TIỀN</b>\n\n` +
                          `👤 Tài khoản: @${user.username}\n` +
                          `💵 Số dư hiện tại: ${user.balance.toLocaleString()}đ\n\n` +
                          `Vui lòng chọn số tiền muốn nạp:`;

            await ctx.replyWithHTML(message, MainMenu.getDepositAmountKeyboard());
            ctx.state.setState({ isSelectingAmount: true });
        } catch (error) {
            Logger.error('Error handling deposit:', error);
            await ctx.reply('❌ Có lỗi xảy ra, vui lòng thử lại sau');
        }
    }

    static async handleBack(ctx) {
        try {
            // Clear any existing state
            ctx.state.clearState();
            
            // Return to main menu
            await ctx.reply(
                '👋 Quay lại menu chính',
                MainMenu.getMainMenuKeyboard()
            );
        } catch (error) {
            Logger.error('Back handler error:', error);
            await ctx.reply('❌ Có lỗi xảy ra. Vui lòng thử lại sau.');
        }
    }

    static async handleAmountSelection(ctx) {
        try {
            const amount = parseInt(ctx.message.text.replace(/[^\d]/g, ''));
            const userId = ctx.from.id;

            const qrCodeUrl = this.createQrCodeWithAmount(userId, amount);
            
            // Tạo inline keyboard với các nút
            const buttons = Markup.inlineKeyboard([
                [Markup.button.callback('✅ Đã thanh toán', `check_payment_${amount}`)],
                [Markup.button.callback('❌ Huỷ giao dịch', 'cancel_payment')]
            ]);

            // Gửi QR code và lưu message
            const qrMessage = await ctx.replyWithPhoto(
                { url: qrCodeUrl },
                {
                    caption: `💳 <b>QUÉT MÃ QR ĐỂ THANH TOÁN</b>\n\n` +
                            `🏦 Ngân hàng: ${BANK_INFO.name}\n` +
                            `👤 Chủ tài khoản: ${BANK_INFO.account_name}\n` +
                            `💳 Số tài khoản: <code>${BANK_INFO.account}</code>\n` +
                            `💰 Số tiền: ${formatNumber(amount)}đ\n` +
                            `📝 Nội dung: <code>TIKUP${userId}</code>\n\n` +
                            `ℹ️ Lưu ý:\n` +
                            `• Vui lòng chuyển đúng số tiền và nội dung\n` +
                            `• Tiền sẽ được cộng tự động sau 1-3 phút\n` +
                            `• Nếu cần hỗ trợ, vui lòng liên hệ admin`,
                    parse_mode: 'HTML',
                    ...buttons
                }
            );

            // Tạo pending transaction với message_id
            await Transaction.create({
                user_id: userId, // đổi userId thành user_id
                amount,
                type: 'deposit',
                status: 'pending',
                message_id: qrMessage.message_id, // đổi qrMessageId thành message_id
                description: `TIKUP${userId}`
            });

            Logger.info('Created pending deposit', {
                userId,
                amount,
                messageId: qrMessage.message_id
            });

            // Lưu state cho context
            ctx.state.setState({ 
                isSelectingAmount: false,
                qrMessageId: qrMessage.message_id,
                pendingAmount: amount 
            });

        } catch (error) {
            Logger.error('Amount selection error:', error);
            await ctx.reply('❌ Có lỗi xảy ra. Vui lòng thử lại sau.');
        }
    }

    static async handleCancelPayment(ctx) {
        Logger.info('Callback query details', {
            data: ctx.callbackQuery.data,
            messageId: ctx.callbackQuery.message.message_id,
            chatId: ctx.callbackQuery.message.chat.id,
        });

        try {
            const state = ctx.state.getState();
            if (!state?.qrMessageId) {
                await ctx.answerCbQuery('❌ Không tìm thấy giao dịch');
                return;
            }

            // Tìm và cập nhật transaction thành cancelled
            const transaction = await Transaction.findByMessageId(state.qrMessageId);
            if (transaction) {
                await Transaction.update(transaction.id, {
                    status: 'cancelled',
                    updated_at: new Date()
                });

                Logger.info('Transaction cancelled', {
                    transactionId: transaction.id,
                    userId: transaction.user_id,
                    messageId: state.qrMessageId
                });
            }

            // Cập nhật message thành "Đã hủy" thay vì xóa
            await ctx.editMessageCaption(
                `❌ <b>GIAO DỊCH ĐÃ HUỶ</b>\n\n` +
                `⏱ Thời gian: ${new Date().toLocaleString('vi-VN')}`,
                {
                    parse_mode: 'HTML',
                    reply_markup: { inline_keyboard: [] } // Xóa các nút
                }
            );

            await ctx.answerCbQuery('✅ Đã huỷ giao dịch');
            
            // Đưa user về menu chính
            await ctx.reply(
                '👋 Quay lại menu chính',
                MainMenu.getMainMenuKeyboard()
            );

            ctx.state.clearState();

        } catch (error) {
            Logger.error('Cancel payment error:', error);
            await ctx.answerCbQuery('❌ Không thể huỷ giao dịch');
        }
    }

    static createQrCodeWithAmount(userId, amount) {
        const customDescription = `TIKUP${userId}`;
        return `https://img.vietqr.io/image/${BANK_INFO.name}-${BANK_INFO.account}-compact.png?amount=${amount}&addInfo=${customDescription}&accountName=${BANK_INFO.account_name}`;
    }

    static async handleWebhook(req, res) {
        try {
            const transactions = req.body.data || [];
            for (const tx of transactions) {
                const { tid, amount, description } = tx;
                const userId = description.match(/TIKUP(\d+)/)?.[1];

                if (!userId || !tid) continue;

                const transaction = await Transaction.create({
                    transactionId: tid,
                    tid,
                    amount: parseFloat(amount),
                    description,
                    userId,
                    type: 'deposit'
                });

                if (transaction) {
                    await User.updateBalance(userId, parseFloat(amount));
                    await Transaction.updateStatus(tid, 'completed');
                    Logger.transaction('Deposit completed', { userId, amount, tid });
                }
            }
            res.status(200).send('OK');
        } catch (error) {
            Logger.error('Webhook handler error:', error);
            res.status(500).send('Internal Server Error');
        }
    }

    static async handleCheckPayment(ctx) {

        try {
            const state = ctx.state.getState();
            const amount = state?.pendingAmount;

            if (!amount) {
                await ctx.answerCbQuery('❌ Không tìm thấy thông tin giao dịch');
                return;
            }

            await ctx.answerCbQuery(
                '⌛️ Hệ thống đang xử lý...\n' +
                'Vui lòng đợi 1-3 phút để tiền được cộng tự động.',
                { show_alert: true }
            );
        } catch (error) {
            Logger.error('Check payment error:', error);
            await ctx.answerCbQuery('❌ Có lỗi xảy ra');
        }
    }
}

module.exports = PaymentController; 