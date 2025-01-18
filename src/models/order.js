const pool = require('../config/database');

class Order {
    static async create(orderData) {
        const {
            userId,
            apiOrderId,
            serviceType,
            link,
            quantity,
            server,
            totalCost,
            status = 'Pending'
        } = orderData;

        const result = await pool.query(
            `INSERT INTO orders (
                user_id, api_order_id, service_type, link, 
                quantity, server, total_cost, status, 
                start_count, remains, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
            RETURNING *`,
            [userId, apiOrderId, serviceType, link, quantity, server, totalCost, status, 0, quantity]
        );
        return result.rows[0];
    }

    static async findById(orderId, userId) {
        const result = await pool.query(
            `SELECT o.*, u.username 
            FROM orders o 
            LEFT JOIN users u ON o.user_id = u.user_id 
            WHERE (o.order_id::TEXT = $1 OR o.api_order_id = $1) 
            AND o.user_id = $2`,
            [orderId, userId]
        );
        return result.rows[0];
    }

    static async updateStatus(apiOrderId, statusData) {
        const result = await pool.query(
            `UPDATE orders 
            SET status = $1,
                start_count = $2,
                remains = $3
            WHERE api_order_id = $4
            RETURNING *`,
            [statusData.status, statusData.startCount, statusData.remains, apiOrderId]
        );
        return result.rows[0];
    }

    static async getRecentOrders(userId, limit = 5) {
        const result = await pool.query(
            `SELECT * FROM orders 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT $2`,
            [userId, limit]
        );
        return result.rows;
    }

    static async getActiveOrders() {
        const result = await pool.query(
            `SELECT api_order_id 
            FROM orders 
            WHERE status NOT IN ('Hoàn thành', 'Đã hủy', 'Hoàn tiền')`
        );
        return result.rows;
    }
}

module.exports = Order; 