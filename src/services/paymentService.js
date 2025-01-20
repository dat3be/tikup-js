// const User = require('../models/user');
// const Transaction = require('../models/transaction');
// const Logger = require('../utils/logger');
// const bot = require('../config/telegram');
// const MainMenu = require('../keyboards/mainMenu');

// class PaymentService {
//     static async processDeposit(webhookData) {
//         try {
//             if (webhookData.error !== 0 || !webhookData.data || !webhookData.data.length) {
//                 throw new Error('Invalid webhook data');
//             }

//             for (const tx of webhookData.data) {
//                 try {
//                     const {
//                         tid,
//                         description,
//                         amount,
//                         when,
//                         bankName,
//                         corresponsiveName,
//                         corresponsiveAccount
//                     } = tx;

//                     // Trích xuất userId từ description
//                     const userId = description.match(/TIKUP(\d+)/i)?.[1];
//                     if (!userId) {
//                         Logger.warn('Invalid transaction description', { description });
//                         continue;
//                     }

//                     // Kiểm tra giao dịch đã xử lý chưa
//                     const existingTx = await Transaction.findOne({ tid });
//                     if (existingTx?.status === 'completed') {
//                         Logger.info('Transaction already processed', { tid });
//                         continue;
//                     }

//                     // Tìm pending transaction gần nhất của user với số tiền tương ứng
//                     const pendingTx = await Transaction.findOne({
//                         userId,
//                         amount: parseFloat(amount),
//                         status: 'Pending'
//                     }).sort({ createdAt: -1 });

//                     let transaction;
//                     let qrMessageId;

//                     if (pendingTx) {
//                         // Cập nhật pending transaction
//                         qrMessageId = pendingTx.qrMessageId;
//                         transaction = await Transaction.findByIdAndUpdate(
//                             pendingTx._id,
//                             {
//                                 tid,
//                                 transactionId: tid,
//                                 bankName,
//                                 timestamp: when,
//                                 status: 'completed'
//                             },
//                             { new: true }
//                         );
//                     } else {
//                         // Tạo transaction mới nếu không tìm thấy pending
//                         transaction = await Transaction.create({
//                             tid,
//                             transactionId: tid,
//                             userId,
//                             amount: parseFloat(amount),
//                             description,
//                             bankName,
//                             senderName: corresponsiveName,
//                             senderAccount: corresponsiveAccount,
//                             timestamp: when,
//                             status: 'completed',
//                             type: 'deposit'
//                         });
//                     }

//                     // Cập nhật số dư user
//                     const updatedBalance = await User.updateBalance(userId, parseFloat(amount));

//                     // Process commission for upline
//                     const commission = await User.processCommission(
//                         transaction.id,
//                         userId,
//                         parseFloat(amount)
//                     );

//                     // If commission was processed, notify upline
//                     if (commission) {
//                         try {
//                             await bot.telegram.sendMessage(
//                                 commission.uplineId,
//                                 `💰 <b>NHẬN HOA HỒNG</b>\n\n` +
//                                 `Bạn nhận được <b>${commission.commissionAmount.toLocaleString()}đ</b>\n` +
//                                 `từ giao dịch nạp tiền của downline\n` +
//                                 `Tỷ lệ hoa hồng: ${commission.rate}%`,
//                                 { parse_mode: 'HTML' }
//                             );
//                         } catch (error) {
//                             Logger.error('Error sending commission notification:', error);
//                         }
//                     }

//                     // Gửi thông báo theo thứ tự
//                     try {
//                         // 1. Cập nhật tin nhắn QR nếu có
//                         if (qrMessageId) {
//                             try {
//                                 await bot.telegram.editMessageCaption(
//                                     userId,
//                                     qrMessageId,
//                                     undefined,
//                                     `✅ THANH TOÁN THÀNH CÔNG\n\n` +
//                                     `💰 Số tiền: +${amount.toLocaleString()}đ\n` +
//                                     `💵 Số dư mới: ${updatedBalance.balance.toLocaleString()}đ`,
//                                     { 
//                                         parse_mode: 'HTML',
//                                         reply_markup: { inline_keyboard: [] }
//                                     }
//                                 );
//                             } catch (err) {
//                                 Logger.error('Error updating QR message:', err);
//                             }
//                         }

//                         // 2. Gửi thông báo chi tiết
//                         await bot.telegram.sendMessage(
//                             userId,
//                             `✅ <b>GIAO DỊCH THÀNH CÔNG</b>\n\n` +
//                             `💰 Số tiền: +${amount.toLocaleString()}đ\n` +
//                             `💳 Mã GD: <code>${tid}</code>\n` +
//                             `🏦 Ngân hàng: ${bankName}\n` +
//                             `👤 Người gửi: ${corresponsiveName}\n` +
//                             `⌛️ Thời gian: ${new Date(when).toLocaleString('vi-VN')}\n` +
//                             `💵 Số dư hiện tại: ${updatedBalance.balance.toLocaleString()}đ\n\n` +
//                             `🎉 Cảm ơn bạn đã sử dụng dịch vụ!`,
//                             { parse_mode: 'HTML' }
//                         );

//                         // 3. Quay về menu chính
//                         await bot.telegram.sendMessage(
//                             userId,
//                             '👋 Giao dịch hoàn tất. Quay lại menu chính:',
//                             MainMenu.getMainMenuKeyboard()
//                         );

//                         Logger.transaction('Deposit completed', {
//                             userId,
//                             amount,
//                             tid,
//                             bankName,
//                             senderName: corresponsiveName
//                         });
//                     } catch (error) {
//                         Logger.error('Error sending notifications:', error);
//                     }
//                 } catch (error) {
//                     Logger.error('Error processing transaction', {
//                         error: error.message,
//                         transaction: tx
//                     });
//                     continue;
//                 }
//             }

//             return { success: true };
//         } catch (error) {
//             Logger.error('Webhook processing error:', error);
//             throw error;
//         }
//     }
// }

// module.exports = PaymentService;
