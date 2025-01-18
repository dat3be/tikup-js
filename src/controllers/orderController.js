const Logger = require('../utils/logger');
const Order = require('../models/order');
const User = require('../models/user');
const { checkOrderStatus } = require('../services/api/hacklikeApi');
const { SERVERS } = require('../config/constants');

class OrderController {
    static async handleOrderStart(ctx) {
        try {
            const userId = ctx.from.id;
            const balance = await User.checkBalance(userId);

            if (balance <= 0) {
                return ctx.reply(
                    '❌ Số dư không đủ để đặt đơn.\n' +
                    '💰 Vui lòng nạp tiền để tiếp tục.'
                );
            }

            await ctx.reply(
                '🌟 Chọn máy chủ:\n\n' +
                Object.entries(SERVERS)
                    .map(([key, server]) => 
                        `${key}. ${server.name} - ${server.cost.toLocaleString()}đ`)
                    .join('\n')
            );
        } catch (error) {
            Logger.error('Order start error:', error);
            await ctx.reply('❌ Có lỗi xảy ra. Vui lòng thử lại sau.');
        }
    }

    static async handleTracking(ctx) {
        try {
            const userId = ctx.from.id;
            const orderId = ctx.message.text.replace('#', '').trim();
            
            if (!/^\d+$/.test(orderId)) {
                return ctx.reply('❌ Mã đơn không hợp lệ. Vui lòng nhập lại.');
            }
            
            const order = await Order.findById(orderId, userId);
            if (!order) {
                return ctx.reply('❌ Không tìm thấy đơn hàng với mã này.');
            }

            const statusData = await checkOrderStatus(order.api_order_id);
            await Order.updateStatus(order.api_order_id, statusData);

            await ctx.replyWithHTML(
                `📦 <b>CHI TIẾT ĐƠN HÀNG</b>\n\n` +
                `🆔 Mã đơn: #${order.api_order_id}\n` +
                `👤 Username: @${order.username}\n` +
                `📝 Dịch vụ: ${order.service_type}\n` +
                `🔗 Link: ${order.link}\n` +
                `👥 Số lượng: ${order.quantity.toLocaleString()}\n` +
                `📊 Đã chạy: ${statusData.startCount.toLocaleString()}\n` +
                `📈 Còn lại: ${statusData.remains.toLocaleString()}\n` +
                `🖥 Máy chủ: ${order.server}\n` +
                `💰 Tổng tiền: ${order.total_cost.toLocaleString()}đ\n` +
                `⏰ Thời gian: ${new Date(order.created_at).toLocaleString()}\n` +
                `⌛️ Trạng thái: ${statusData.status}\n\n` +
                `ℹ️ Đơn hàng sẽ được xử lý trong vòng 24h.`
            );
        } catch (error) {
            Logger.error('Tracking error:', error);
            await ctx.reply('❌ Đã xảy ra lỗi khi kiểm tra đơn hàng.');
        }
    }
}

module.exports = OrderController; 