const db = require('../config/database');
const Logger = require('../utils/logger');
const Affiliate = require('./affiliate');

class User {
    static async create(userId, username, referredBy = null) {
        try {
            Logger.info(`Creating/updating user: ${userId}, ${username}, referred by: ${referredBy}`);

            const query = `
                INSERT INTO users 
                (user_id, username, referred_by, rank, balance)
                VALUES ($1, $2, $3, 'Bronze', 0)
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    username = EXCLUDED.username,
                    referred_by = COALESCE(users.referred_by, EXCLUDED.referred_by)
                RETURNING *
            `;
            
            const values = [
                userId.toString(),
                username || 'Unknown',
                referredBy
            ];

            const result = await db.query(query, values);
            Logger.info(`User create/update result:`, result.rows[0]);
            return result.rows[0];
        } catch (error) {
            Logger.error('Error creating user:', error);
            throw error;
        }
    }

    static async updateBalance(userId, amount) {
        try {
            const query = `
                UPDATE users 
                SET balance = balance + $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $1
                RETURNING *
            `;
            const result = await db.query(query, [userId, amount]);
            return result.rows[0];
        } catch (error) {
            Logger.error('Error updating balance:', error);
            throw error;
        }
    }

    static async findById(userId) {
        try {
            const query = `
                SELECT 
                    u.*,
                    ref.username as referrer_username
                FROM users u
                LEFT JOIN users ref ON u.referred_by = ref.user_id
                WHERE u.user_id = $1
            `;
            const result = await db.query(query, [userId]);
            
            // // Log kết quả để debug
            // if (result.rows[0]) {
            //     Logger.info(`Found user ${userId} with referrer ${result.rows[0].referred_by}`);
            // }
            
            return result.rows[0];
        } catch (error) {
            Logger.error('Error finding user:', error);
            throw error;
        }
    }

    static async getRankInfo(userId) {
        try {
            const query = `
                SELECT 
                    u.user_id,
                    u.username,
                    u.balance,
                    u.rank,
                    u.referred_by,
                    r.commission_rate,
                    COUNT(ref.user_id) as current_referrals,
                    COALESCE(SUM(c.commission_amount), 0) as total_commission
                FROM users u
                JOIN ranks r ON u.rank = r.name
                LEFT JOIN users ref ON ref.referred_by = (
                    SELECT aff_code 
                    FROM affiliates 
                    WHERE user_id = u.user_id
                )
                LEFT JOIN commissions c ON c.user_id = u.user_id
                WHERE u.user_id = $1
                GROUP BY 
                    u.user_id, 
                    u.username,
                    u.balance,
                    u.rank,
                    u.referred_by,
                    r.commission_rate
            `;
            
            return (await db.query(query, [userId])).rows[0];
        } catch (error) {
            Logger.error('Error getting rank info:', error);
            throw error;
        }
    }

    static async checkBalance(userId) {
        try {
            const query = 'SELECT balance FROM users WHERE user_id = $1';
            const result = await db.query(query, [userId]);
            return result.rows[0]?.balance || 0;
        } catch (error) {
            Logger.error('Error checking balance:', error);
            throw error;
        }
    }

    static async updateRank(userId) {
        try {
            // Get user's affiliate code
            const affiliate = await Affiliate.findByUserId(userId);
            if (!affiliate) return null;

            // Get referral count using affiliate code
            const countQuery = `
                SELECT COUNT(*) as count 
                FROM users 
                WHERE referred_by = $1
            `;
            const referralCount = (await db.query(countQuery, [affiliate.aff_code])).rows[0].count;

            // Get appropriate rank based on count
            const rankQuery = `
                SELECT name, required_referrals
                FROM ranks
                WHERE required_referrals <= $1
                ORDER BY required_referrals DESC
                LIMIT 1
            `;
            const newRank = (await db.query(rankQuery, [referralCount])).rows[0];

            // Update user's rank
            if (newRank) {
                await db.query(
                    'UPDATE users SET rank = $1 WHERE user_id = $2',
                    [newRank.name, userId]
                );
            }

            return newRank?.name;
        } catch (error) {
            Logger.error('Error updating rank:', error);
            throw error;
        }
    }
}

module.exports = User; 