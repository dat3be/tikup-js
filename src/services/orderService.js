const Order = require('../models/order');
const User = require('../models/user');
const HacklikeApi = require('./api/hacklikeApi');
const { SERVERS } = require('../config/constants');

class OrderService {
    static async createOrder(userId, orderData) {
        const { server, quantity, link } = orderData;
        const serverInfo = SERVERS[server];

        if (!serverInfo) {
            throw new Error('Invalid server selection');
        }

        const totalCost = quantity * serverInfo.cost;
        const balance = await User.checkBalance(userId);

        if (balance < totalCost) {
            throw new Error('Insufficient balance');
        }

        try {
            // Place order with API
            const apiResponse = await HacklikeApi.placeOrder({
                serviceId: serverInfo.id,
                link,
                quantity
            });

            // Create local order record
            const order = await Order.create({
                userId,
                apiOrderId: apiResponse,
                serviceType: serverInfo.name,
                link,
                quantity,
                server,
                totalCost,
                status: 'Pending'
            });

            // Deduct user balance
            await User.updateBalance(userId, -totalCost);

            return order;
        } catch (error) {
            console.error('Order creation error:', error);
            throw error;
        }
    }

    static async checkAndUpdateOrders() {
        try {
            const activeOrders = await Order.getActiveOrders();
            
            for (const order of activeOrders) {
                try {
                    const statusData = await HacklikeApi.checkOrderStatus(order.api_order_id);
                    await Order.updateStatus(order.api_order_id, statusData);
                } catch (error) {
                    console.error(`Error updating order ${order.api_order_id}:`, error);
                    continue;
                }
            }
        } catch (error) {
            console.error('Batch update error:', error);
            throw error;
        }
    }
}

module.exports = OrderService; 