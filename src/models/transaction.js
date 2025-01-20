const db = require('../config/database');
const Logger = require('../utils/logger');

class Transaction {
    static async create(transactionData) {
        try {
            const {
                user_id,
                amount,
                type,
                status = 'pending',
                tid,
                bank_name,
                bank_account,
                description,
                message_id
            } = transactionData;

            const query = `
                INSERT INTO transactions (
                    user_id, amount, type, status, tid,
                    bank_name, bank_account, description, message_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `;

            const values = [
                user_id,
                amount,
                type,
                status,
                tid,
                bank_name,
                bank_account,
                description,
                message_id
            ];

            const result = await db.query(query, values);
            return result.rows[0];
        } catch (error) {
            Logger.error('Error creating transaction:', error);
            throw error;
        }
    }

    static async findByTid(tid) {
        try {
            const query = `
                SELECT * FROM transactions 
                WHERE tid = $1
            `;
            const result = await db.query(query, [tid]);
            return result.rows[0];
        } catch (error) {
            Logger.error('Error finding transaction:', error);
            throw error;
        }
    }

    static async findPendingDeposit(userId, amount) {
        try {
            const query = `
                SELECT * FROM transactions 
                WHERE user_id = $1 
                AND amount = $2 
                AND type = 'deposit' 
                AND status = 'pending'
                ORDER BY created_at DESC 
                LIMIT 1
            `;
            const result = await db.query(query, [userId, amount]);
            return result.rows[0];
        } catch (error) {
            Logger.error('Error finding pending deposit:', error);
            throw error;
        }
    }

    static async update(id, updateData) {
        try {
            const setClauses = [];
            const values = [id];
            let paramIndex = 2;

            Object.entries(updateData).forEach(([key, value]) => {
                setClauses.push(`${key} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            });

            const query = `
                UPDATE transactions 
                SET ${setClauses.join(', ')}
                WHERE id = $1
                RETURNING *
            `;

            const result = await db.query(query, values);
            return result.rows[0];
        } catch (error) {
            Logger.error('Error updating transaction:', error);
            throw error;
        }
    }

    static async findByMessageId(messageId) {
        try {
            const query = `
                SELECT * FROM transactions 
                WHERE message_id = $1 
                AND status = 'pending'
                ORDER BY created_at DESC 
                LIMIT 1
            `;
            const result = await db.query(query, [messageId]);
            return result.rows[0];
        } catch (error) {
            Logger.error('Error finding transaction by message_id:', error);
            throw error;
        }
    }

    static async getPendingTransactions() {
        try {
            const query = `
                SELECT * FROM transactions 
                WHERE status = 'pending'
                AND type = 'deposit'
                AND created_at > NOW() - INTERVAL '16 minutes'
                AND created_at <= NOW() - INTERVAL '5 minutes'
            `;
            const result = await db.query(query);
            return result.rows;
        } catch (error) {
            Logger.error('Error getting pending transactions:', error);
            throw error;
        }
    }
}

module.exports = Transaction; 