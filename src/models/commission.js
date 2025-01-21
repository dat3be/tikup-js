const db = require('../config/database');
const Logger = require('../utils/logger');

class Commission {
    static async create(data) {
        try {
            // Validate dữ liệu đầu vào
            if (!data.user_id || !data.referral_id || !data.transaction_id || !data.commission_amount) {
                const error = new Error('Missing required commission data');
                Logger.error('Invalid commission data:', {
                    user_id: data.user_id,
                    referral_id: data.referral_id,
                    transaction_id: data.transaction_id,
                    commission_amount: data.commission_amount
                });
                throw error;
            }

            const query = `
                INSERT INTO commissions (
                    user_id,
                    referral_id,
                    transaction_id,
                    commission_amount
                )
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;

            const values = [
                data.user_id,
                data.referral_id,
                data.transaction_id,
                data.commission_amount
            ];

            Logger.info('Creating commission with values:', {
                values,
                query_text: query
            });

            const result = await db.query(query, values);
            return result.rows[0];
        } catch (error) {
            Logger.error('Error creating commission:', {
                error: error.message,
                data: data
            });
            throw error;
        }
    }

    static async getByUserId(user_id) {
        try {
            const query = `
                SELECT 
                    c.*,
                    u.username as referral_username,
                    t.amount as transaction_amount
                FROM commissions c
                JOIN users u ON c.referral_id = u.user_id
                JOIN transactions t ON c.transaction_id = t.id
                WHERE c.user_id = $1
                ORDER BY c.created_at DESC
            `;
            
            const result = await db.query(query, [user_id]);
            return result.rows;
        } catch (error) {
            Logger.error('Error getting commissions:', error);
            throw error;
        }
    }

    static async getTotalByUser(userId) {
        try {
            const query = `
                SELECT COALESCE(SUM(amount), 0) as total
                FROM commissions
                WHERE user_id = $1
            `;
            const result = await db.query(query, [userId]);
            return result.rows[0].total;
        } catch (error) {
            Logger.error('Error getting total commission:', error);
            throw error;
        }
    }
}

module.exports = Commission; 