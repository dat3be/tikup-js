const Logger = require('../utils/logger');
const Order = require('../models/order');
const User = require('../models/user');
const { checkOrderStatus } = require('../services/api/hacklikeApi');
const Cache = require('../utils/cache');
const HacklikeApi = require('../services/api/hacklikeApi');
const MainMenu = require('../keyboards/mainMenu');

class OrderController {
    static async handleOrderStart(ctx) {
        try {
            const userId = ctx.from.id;
            Logger.info('Starting order process:', { user_id: userId });

            const balance = await User.checkBalance(userId);
            Logger.info('User balance:', { user_id: userId, balance });

            if (balance <= 0) {
                Logger.info('Insufficient balance:', { user_id: userId, balance });
                return ctx.reply(
                    '❌ Số dư không đủ để đặt đơn.\n' +
                    '💰 Vui lòng nạp tiền để tiếp tục.'
                );
            }

            // Hiển thị danh sách với keyboard đơn giản
            await ctx.reply(
                '🌟 TĂNG FOLLOW TIKTOK\n\n' +
                '💰 Số dư: ' + balance.toLocaleString() + 'đ\n\n' +
                '[1] Tiktok Followers - Chậm\n' +
                '• Tốc độ: 300-500 follow/ngày\n' +
                '• Tối thiểu: 200 follow\n' +
                '• Giá: 150đ/follow\n\n' +
                '[2] Tiktok Followers - Nhanh\n' +
                '• Tốc độ: 1-3k follow/ngày\n' +
                '• Tối thiểu: 500 follow\n' +
                '• Giá: 250đ/follow\n\n' +
                '👉 Nhập số [1-2] để chọn dịch vụ:', 
                {
                    reply_markup: {
                        keyboard: [['1', '2']],
                        resize_keyboard: true
                    }
                }
            );

            // Lưu trạng thái chờ chọn dịch vụ
            await Cache.set(`order:${userId}`, {
                step: 'selecting_service'
            });

            Logger.info('Service list displayed:', { user_id: userId });

        } catch (error) {
            Logger.error('Order start error:', {
                error: error.message,
                user_id: ctx.from.id,
                stack: error.stack
            });
            await ctx.reply('❌ Có lỗi xảy ra. Vui lòng thử lại sau.');
        }
    }

    static async handleText(ctx) {
        try {
            const userId = ctx.from.id;
            const text = ctx.message.text;
            const orderData = await Cache.get(`order:${userId}`);

            if (!orderData) return;

            Logger.info('Processing text:', {
                user_id: userId,
                text,
                step: orderData.step
            });

            switch (orderData.step) {
                case 'selecting_service':
                    if (['1', '2'].includes(text)) {
                        await OrderController.processServiceSelection(ctx, text);
                    }
                    break;

                case 'waiting_link':
                    await OrderController.processLink(ctx, text, orderData);
                    break;

                case 'waiting_quantity':
                    await OrderController.processQuantity(ctx, text, orderData);
                    break;

                case 'confirming':
                    await OrderController.processConfirmation(ctx, text, orderData);
                    break;
            }

        } catch (error) {
            Logger.error('Text handler error:', {
                error: error.message,
                user_id: ctx.from.id,
                text: ctx.message?.text,
                stack: error.stack
            });
            await ctx.reply('❌ Có lỗi xảy ra. Vui lòng thử lại.');
        }
    }

    static async processServiceSelection(ctx, serviceId) {
        try {
            const userId = ctx.from.id;
            const services = {
                '1': {
                    name: 'Tiktok Followers - Chậm (mua dồn đơn để lên nhanh)',
                    cost: 150,
                    min: 200,
                    speed: '200 follow/ngày',
                    api_service: 'server_6'
                },
                '2': {
                    name: 'Tiktok Followers - Nhanh',
                    cost: 250,
                    min: 500,
                    speed: '500 follow/ngày',
                    api_service: 'server_1'
                }
            };

            const service = services[serviceId];
            await Cache.set(`order:${userId}`, {
                step: 'waiting_link',
                ...service
            });

            await ctx.reply(
                '🌟 NHẬP LINK TIKTOK\n\n' +
                `⚡️ Dịch vụ: ${service.name}\n` +
                `💰 Giá: ${service.cost.toLocaleString()}đ/follow\n` +
                `📊 Tốc độ: ${service.speed}\n` +
                `⚠️ Tối thiểu: ${service.min.toLocaleString()} follow\n\n` +
                '👉 Vui lòng gửi link profile TikTok:',
                { reply_markup: { remove_keyboard: true } }
            );

        } catch (error) {
            Logger.error('Service selection error:', error);
            await ctx.reply('❌ Có lỗi xảy ra. Vui lòng thử lại.');
        }
    }

    static async processLink(ctx, link, orderData) {
        try {
            if (!link.match(/https:\/\/(www\.|vm\.)?tiktok\.com\/@[a-zA-Z0-9._-]+/i)) {
                return ctx.reply('❌ Link không hợp lệ. Vui lòng gửi link profile TikTok hợp lệ.');
            }

            orderData.link = link;
            orderData.step = 'waiting_quantity';
            await Cache.set(`order:${ctx.from.id}`, orderData);

            await ctx.reply(
                '🌟 NHẬP SỐ LƯỢNG\n\n' +
                `🔗 Link: ${link}\n` +
                `⚡️ Dịch vụ: ${orderData.name}\n` +
                `💰 Giá: ${orderData.cost.toLocaleString()}đ/follow\n` +
                `⚠️ Tối thiểu: ${orderData.min.toLocaleString()} follow\n\n` +
                '👉 Nhập số lượng follow cần tăng:'
            );

        } catch (error) {
            Logger.error('Link processing error:', error);
            await ctx.reply('❌ Có lỗi xảy ra. Vui lòng thử lại.');
        }
    }

    static async processQuantity(ctx, text, orderData) {
        try {
            const quantity = parseInt(text);
            const userId = ctx.from.id;

            if (isNaN(quantity) || quantity < orderData.min) {
                return ctx.reply(`❌ Số lượng không hợp lệ. Vui lòng nhập tối thiểu ${orderData.min.toLocaleString()} follow.`);
            }

            const totalCost = quantity * orderData.cost;
            const balance = await User.checkBalance(userId);

            if (balance < totalCost) {
                return ctx.reply(
                    '❌ Số dư không đủ để đặt đơn này\n' +
                    `💰 Cần thêm: ${(totalCost - balance).toLocaleString()}đ`
                );
            }

            orderData.quantity = quantity;
            orderData.total_cost = totalCost;
            orderData.step = 'confirming';
            await Cache.set(`order:${userId}`, orderData);

            await ctx.reply(
                '🌟 XÁC NHẬN ĐƠN HÀNG\n\n' +
                `🔗 Link: ${orderData.link}\n` +
                `⚡️ Dịch vụ: ${orderData.name}\n` +
                `👥 Số lượng: ${quantity.toLocaleString()} follow\n` +
                `💰 Đơn giá: ${orderData.cost.toLocaleString()}đ/follow\n` +
                `💵 Tổng tiền: ${totalCost.toLocaleString()}đ\n` +
                `⚡️ Số dư sau khi đặt: ${(balance - totalCost).toLocaleString()}đ\n\n` +
                '👉 Nhập "ok" để xác nhận đặt đơn\n' +
                '👉 Nhập "huy" để hủy đơn hàng',
                {
                    reply_markup: {
                        keyboard: [['ok', 'huy']],
                        resize_keyboard: true
                    }
                }
            );

        } catch (error) {
            Logger.error('Quantity processing error:', error);
            await ctx.reply('❌ Có lỗi xảy ra. Vui lòng thử lại.');
        }
    }

    static async processConfirmation(ctx, text, orderData) {
        try {
            const userId = ctx.from.id;

            if (text.toLowerCase() === 'ok') {
                // Chuẩn bị data cho API
                const apiOrderData = {
                    token: process.env.HACKLIKE17_TOKEN,
                    link: orderData.link,
                    server: orderData.api_service,
                    count: orderData.quantity.toString(),
                    note: 'TikUp Bot'
                };

                Logger.info('Preparing order:', {
                    user_id: userId,
                    link: apiOrderData.link,
                    server: apiOrderData.server,
                    count: apiOrderData.count
                });

                // Gọi API đặt đơn
                const apiOrderId = await HacklikeApi.placeOrder(apiOrderData);
                
                // Trừ tiền user
                await User.updateBalance(userId, -orderData.total_cost);

                // Lưu đơn hàng vào database
                const order = await Order.create({
                    user_id: userId,
                    api_order_id: apiOrderId,
                    service: orderData.name,
                    link: orderData.link,
                    quantity: orderData.quantity,
                    price: orderData.cost,
                    total: orderData.total_cost,
                    status: 'pending',
                    note: 'TikUp Bot'
                });

                Logger.info('Order saved to database:', {
                    order_id: order.id,
                    api_order_id: apiOrderId
                });

                await ctx.reply(
                    '✅ ĐẶT ĐƠN THÀNH CÔNG\n\n' +
                    `🔗 Link: ${orderData.link}\n` +
                    `⚡️ Dịch vụ: ${orderData.name}\n` +
                    `👥 Số lượng: ${orderData.quantity.toLocaleString()} follow\n` +
                    `💰 Tổng tiền: ${orderData.total_cost.toLocaleString()}đ\n` +
                    `🔢 Mã đơn: #${apiOrderId}\n\n` +
                    '⏳ Hệ thống đang xử lý...',
                    { reply_markup: { remove_keyboard: true } }
                );

                Logger.info('Order completed:', {
                    user_id: userId,
                    order_id: order.id,
                    api_order_id: apiOrderId,
                    amount: orderData.total_cost
                });

            } else if (text.toLowerCase() === 'huy') {
                await ctx.reply('🚫 Đã hủy đơn hàng', {
                    reply_markup: { remove_keyboard: true }
                });
            }

            await Cache.del(`order:${userId}`);

        } catch (error) {
            Logger.error('Order confirmation error:', {
                error: error.message,
                user_id: ctx.from.id,
                data: orderData
            });
            await ctx.reply(
                '❌ Có lỗi xảy ra khi đặt đơn. Vui lòng thử lại sau.\n' +
                'Nếu tiền đã bị trừ, hãy liên hệ Admin để được hỗ trợ.',
                { reply_markup: { remove_keyboard: true } }
            );
        }
    }

    static isValidTikTokLink(link) {
        return link.match(/https:\/\/(www\.|vm\.)?tiktok\.com\/@[a-zA-Z0-9._-]+/i) !== null;
    }

    static async handleCancelOrder(ctx) {
        try {
            const userId = ctx.from.id;
            await Cache.del(`order:${userId}`);
            await ctx.editMessageText('🚫 Đã hủy đơn hàng');
        } catch (error) {
            Logger.error('Cancel order error:', {
                error: error.message,
                user_id: ctx.from.id,
                stack: error.stack
            });
            await ctx.answerCallbackQuery('❌ Có lỗi xảy ra khi hủy đơn.');
        }
    }

    static async handleTracking(ctx) {
        try {
            const text = ctx.message.text;
            
            // Skip if it's the track command
            if (text === '🔍 Track') {
                return;
            }

            // Remove # if exists and trim spaces
            const orderId = text.replace('#', '').trim();

            // Validate order ID format
            if (!/^\d+$/.test(orderId)) {
                await ctx.reply('❌ Mã đơn không hợp lệ.\nVí dụ: #46916019 hoặc 46916019');
                return;
            }

            // Find order in database
            const order = await Order.findByApiOrderId(orderId);
            
            if (!order) {
                await ctx.reply('❌ Không tìm thấy đơn hàng này.');
                ctx.state.clearState();
                return;
            }

            // Convert both to string for comparison
            const telegramUserId = ctx.from.id.toString();
            const orderTelegramUserId = order.telegram_user_id.toString();

            Logger.info('Checking order ownership:', {
                telegram_user_id: telegramUserId,
                order_telegram_user_id: orderTelegramUserId,
                api_order_id: orderId
            });

            // Check if user owns this order
            if (telegramUserId !== orderTelegramUserId) {
                await ctx.reply('❌ Bạn không có quyền xem đơn hàng này.');
                ctx.state.clearState();
                return;
            }

            // Get latest status from API
            const apiStatus = await HacklikeApi.checkOrderStatus(orderId);
            
            // Format order date
            const orderDate = new Date(order.created_at)
                .toLocaleString('vi-VN', { 
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });

            // Status emoji
            const statusEmoji = {
                'pending': '⏳',
                'processing': '⚡',
                'completed': '✅',
                'canceled': '❌',
                'error': '⚠️'
            }[order.status] || '❓';

            let message = '🔍 THÔNG TIN ĐƠN HÀNG\n\n';
            message += `${statusEmoji} Đơn #${order.api_order_id}\n`;
            message += `⏰ Ngày đặt: ${orderDate}\n`;
            message += `🔗 Dịch vụ: ${order.service_name}\n`;
            message += `📌 Link: ${order.link}\n`;
            message += `👥 Số lượng: ${order.quantity.toLocaleString()}\n`;
            message += `💵 Đơn giá: ${order.price_per_unit}đ\n`;
            message += `💰 Tổng tiền: ${order.total_price.toLocaleString()}đ\n`;
            message += `📊 Trạng thái: ${order.status}\n`;

            // Add API status info if available
            if (apiStatus) {
                if (apiStatus.start_count) {
                    message += `👥 Đã chạy: ${apiStatus.start_count.toLocaleString()}\n`;
                }
                if (apiStatus.remains) {
                    message += `⏳ Còn lại: ${apiStatus.remains.toLocaleString()}\n`;
                }
                if (apiStatus.msg) {
                    message += `\n📝 Ghi chú: ${apiStatus.msg}\n`;
                }
            }

            await ctx.reply(message);
            
            // Clear tracking state
            ctx.state.clearState();
            
            // Return to main menu
            await ctx.reply(
                '👋 Quay lại menu chính',
                MainMenu.getMainMenuKeyboard()
            );

        } catch (error) {
            Logger.error('Tracking error:', {
                error: error.message,
                user_id: ctx.from?.id,
                text: ctx.message?.text,
                state: ctx.state.getState()
            });
            ctx.state.clearState();
            await ctx.reply(
                '👋 Quay lại menu chính',
                MainMenu.getMainMenuKeyboard()
            );
        }
    }
}

module.exports = OrderController; 