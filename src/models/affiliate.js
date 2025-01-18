const db = require('../config/database');
const Logger = require('../utils/logger');

class Affiliate {
    static async create(data) {
        try {
            Logger.info('Creating new affiliate:', data);
            const query = `
                INSERT INTO affiliates 
                (user_id, aff_code, aff_link, commission, total_commission, 
                total_referrals, commission_rate, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `;
            const values = [
                data.user_id,
                data.aff_code,
                data.aff_link,
                data.commission || 0,
                data.total_commission || 0,
                data.total_referrals || 0,
                data.commission_rate || 5,
                data.status || 'active'
            ];
            const result = await db.query(query, values);
            return result.rows[0];
        } catch (error) {
            Logger.error('Error creating affiliate:', error);
            throw error;
        }
    }

    static async findByUserId(userId) {
        try {
            const query = 'SELECT * FROM affiliates WHERE user_id = $1';
            const result = await db.query(query, [userId]);
            return result.rows[0];
        } catch (error) {
            Logger.error('Error finding affiliate by user ID:', error);
            throw error;
        }
    }

    static async findByAffCode(affCode) {
        try {
            const query = 'SELECT * FROM affiliates WHERE aff_code = $1';
            const result = await db.query(query, [affCode]);
            return result.rows[0];
        } catch (error) {
            Logger.error('Error finding affiliate by code:', error);
            throw error;
        }
    }

    static async updateCommission(userId, amount) {
        try {
            const query = `
                UPDATE affiliates 
                SET commission = commission + $1,
                    total_commission = total_commission + $1,
                    updated_at = NOW()
                WHERE user_id = $2
                RETURNING *
            `;
            const result = await db.query(query, [amount, userId]);
            return result.rows[0];
        } catch (error) {
            Logger.error('Error updating affiliate commission:', error);
            throw error;
        }
    }

    static async incrementReferrals(userId) {
        try {
            const query = `
                UPDATE affiliates 
                SET total_referrals = total_referrals + 1,
                    updated_at = NOW()
                WHERE user_id = $1
                RETURNING *
            `;
            const result = await db.query(query, [userId]);
            return result.rows[0];
        } catch (error) {
            Logger.error('Error incrementing referrals:', error);
            throw error;
        }
    }
}

module.exports = Affiliate; 