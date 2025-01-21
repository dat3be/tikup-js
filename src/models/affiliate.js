const db = require('../config/database');
const Logger = require('../utils/logger');
const { AFFILIATE_RANKS } = require('../config/constants');

class Affiliate {
    static async create(data) {
        try {
            Logger.info('Creating new affiliate:', data);
            const query = `
                INSERT INTO affiliates 
                (user_id, aff_code, aff_link, rank, commission_rate, total_referrals, total_commission)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `;
            const values = [
                data.user_id,
                data.aff_code,
                data.aff_link,
                AFFILIATE_RANKS.BRONZE.name,  // Rank mặc định là Bronze
                AFFILIATE_RANKS.BRONZE.commission_rate, // Commission rate mặc định là 3%
                0, // total_referrals bắt đầu từ 0
                0  // total_commission bắt đầu từ 0
            ];

            Logger.info('Creating affiliate with values:', { values });
            const result = await db.query(query, values);
            return result.rows[0];
        } catch (error) {
            Logger.error('Error creating affiliate:', {
                error: error.message,
                data,
                stack: error.stack
            });
            throw error;
        }
    }

    static async findByUserId(user_id) {
        try {
            const query = 'SELECT * FROM affiliates WHERE user_id = $1';
            const result = await db.query(query, [user_id]);
            return result.rows[0];
        } catch (error) {
            Logger.error('Error finding affiliate:', {
                error: error.message,
                user_id,
                stack: error.stack
            });
            throw error;
        }
    }

    static async findByAffCode(aff_code) {
        try {
            const query = 'SELECT * FROM affiliates WHERE aff_code = $1';
            const result = await db.query(query, [aff_code]);
            return result.rows[0];
        } catch (error) {
            Logger.error('Error finding affiliate:', {
                error: error.message,
                aff_code,
                stack: error.stack
            });
            throw error;
        }
    }

    static async updateCommission(user_id, commission_amount) {
        try {
            const query = `
                UPDATE affiliates 
                SET total_commission = total_commission + $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $2
                RETURNING *
            `;
            
            Logger.info('Updating affiliate commission:', {
                user_id,
                commission_amount
            });

            const result = await db.query(query, [commission_amount, user_id]);
            return result.rows[0];
        } catch (error) {
            Logger.error('Error updating commission:', {
                error: error.message,
                user_id,
                commission_amount,
                stack: error.stack
            });
            throw error;
        }
    }

    static async incrementReferrals(affiliate_id) {
        try {
            // 1. Tăng total_referrals
            const incrementQuery = `
                UPDATE affiliates 
                SET total_referrals = total_referrals + 1
                WHERE id = $1
                RETURNING *
            `;
            
            const affiliate = await db.query(incrementQuery, [affiliate_id]);
            
            // 2. Kiểm tra và cập nhật rank mới
            return await this.updateRank(affiliate_id);
        } catch (error) {
            Logger.error('Error incrementing referrals:', {
                error: error.message,
                affiliate_id,
                stack: error.stack
            });
            throw error;
        }
    }

    static async updateRank(affiliate_id) {
        try {
            // 1. Lấy thông tin affiliate hiện tại
            const currentQuery = `
                SELECT * FROM affiliates WHERE id = $1
            `;
            const currentResult = await db.query(currentQuery, [affiliate_id]);
            const currentAffiliate = currentResult.rows[0];

            if (!currentAffiliate) {
                throw new Error('Affiliate not found');
            }

            // 2. Xác định rank mới dựa trên total_referrals
            let newRank = AFFILIATE_RANKS.BRONZE;
            let newCommissionRate = AFFILIATE_RANKS.BRONZE.commission_rate;

            if (currentAffiliate.total_referrals >= AFFILIATE_RANKS.DIAMOND.required_referrals) {
                newRank = AFFILIATE_RANKS.DIAMOND;
                newCommissionRate = AFFILIATE_RANKS.DIAMOND.commission_rate;
            } else if (currentAffiliate.total_referrals >= AFFILIATE_RANKS.PLATINUM.required_referrals) {
                newRank = AFFILIATE_RANKS.PLATINUM;
                newCommissionRate = AFFILIATE_RANKS.PLATINUM.commission_rate;
            } else if (currentAffiliate.total_referrals >= AFFILIATE_RANKS.GOLD.required_referrals) {
                newRank = AFFILIATE_RANKS.GOLD;
                newCommissionRate = AFFILIATE_RANKS.GOLD.commission_rate;
            } else if (currentAffiliate.total_referrals >= AFFILIATE_RANKS.SILVER.required_referrals) {
                newRank = AFFILIATE_RANKS.SILVER;
                newCommissionRate = AFFILIATE_RANKS.SILVER.commission_rate;
            }

            // 3. Cập nhật nếu có thay đổi rank
            if (currentAffiliate.rank !== newRank.name) {
                Logger.info('Updating affiliate rank:', {
                    affiliate_id,
                    old_rank: currentAffiliate.rank,
                    new_rank: newRank.name,
                    old_rate: currentAffiliate.commission_rate,
                    new_rate: newCommissionRate,
                    total_referrals: currentAffiliate.total_referrals
                });

                const updateQuery = `
                    UPDATE affiliates 
                    SET rank = $1,
                        commission_rate = $2,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $3
                    RETURNING *
                `;

                const result = await db.query(updateQuery, [
                    newRank.name,
                    newCommissionRate,
                    affiliate_id
                ]);

                return result.rows[0];
            }

            return currentAffiliate;
        } catch (error) {
            Logger.error('Error updating rank:', {
                error: error.message,
                affiliate_id,
                stack: error.stack
            });
            throw error;
        }
    }
}

module.exports = Affiliate; 