const pool = require('../config/database');
const Logger = require('../utils/logger');

class Order {
    static async create(orderData) {
        const query = `
            INSERT INTO orders (
                user_id, 
                api_order_id, 
                service_name, 
                link, 
                quantity, 
                price_per_unit, 
                total_price, 
                status, 
                note,
                created_at
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            RETURNING *
        `;

        try {
            const values = [
                orderData.user_id,
                orderData.api_order_id,
                orderData.service,
                orderData.link,
                orderData.quantity,
                orderData.price,
                orderData.total,
                'pending',
                orderData.note || 'TikUp Bot'
            ];

            const result = await pool.query(query, values);
            Logger.info('Order created:', result.rows[0]);
            return result.rows[0];
        } catch (error) {
            Logger.error('Create order error:', error);
            throw error;
        }
    }

    static async findByUserId(userId) {
        const query = `
            SELECT * FROM orders 
            WHERE user_id = $1 
            ORDER BY created_at DESC
        `;

        try {
            const result = await pool.query(query, [userId]);
            return result.rows;
        } catch (error) {
            Logger.error('Find orders error:', error);
            throw error;
        }
    }

    static async findByApiOrderId(apiOrderId) {
        try {
            const query = `
                SELECT o.*, u.user_id as telegram_user_id 
                FROM orders o
                JOIN users u ON o.user_id = u.id
                WHERE o.api_order_id = $1
                LIMIT 1
            `;
            const result = await pool.query(query, [apiOrderId]);
            return result.rows[0];
        } catch (error) {
            Logger.error('Find order error:', {
                error: error.message,
                api_order_id: apiOrderId
            });
            throw error;
        }
    }

    static async updateStatus(orderId, newStatus) {
        const query = `
            UPDATE orders 
            SET status = $1, updated_at = NOW() 
            WHERE id = $2 
            RETURNING *
        `;

        try {
            const result = await pool.query(query, [newStatus, orderId]);
            Logger.info('Order status updated:', result.rows[0]);
            return result.rows[0];
        } catch (error) {
            Logger.error('Update order status error:', error);
            throw error;
        }
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

    static async findById(orderId) {
        const query = `
            SELECT * FROM orders 
            WHERE id = $1 
            LIMIT 1
        `;

        try {
            const result = await pool.query(query, [orderId]);
            return result.rows[0];
        } catch (error) {
            Logger.error('Find order by ID error:', error);
            throw error;
        }
    }
}

module.exports = Order; 