const db = require('../config/database');
const Logger = require('../utils/logger');

class Commission {
    static async create({ user_id, referral_id, transaction_id, amount, commission_amount }) {
        try {
            const query = `
                INSERT INTO commissions 
                (user_id, referral_id, transaction_id, amount, commission_amount)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;
            const values = [user_id, referral_id, transaction_id, amount, commission_amount];
            const result = await db.query(query, values);
            return result.rows[0];
        } catch (error) {
            Logger.error('Error creating commission:', error);
            throw error;
        }
    }

    static async getTotalByUser(userId) {
        try {
            const query = `
                SELECT COALESCE(SUM(commission_amount), 0) as total
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