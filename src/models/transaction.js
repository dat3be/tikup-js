const db = require('../config/database');
const Logger = require('../utils/logger');

class Transaction {
    static async create(data) {
        try {
            const query = `
                INSERT INTO transactions (
                    user_id, amount, description, 
                    message_id, status, 
                    transaction_id, tid, bank_name, 
                    sender_name, sender_account, timestamp
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *
            `;
            const values = [
                data.userId,
                data.amount,
                data.description,
                data.qrMessageId,
                data.status || 'Pending',
                data.transactionId || null,  // Allow null
                data.tid || null,           // Allow null
                data.bankName || null,      // Allow null
                data.senderName || null,    // Allow null
                data.senderAccount || null, // Allow null
                data.timestamp || new Date()
            ];
            const result = await db.query(query, values);
            return result.rows[0];
        } catch (error) {
            Logger.error('Error creating transaction:', error);
            throw error;
        }
    }

    static async updateStatus(tid, status) {
        const result = await db.query(
            `UPDATE transactions 
            SET status = $1 
            WHERE tid = $2 
            RETURNING *`,
            [status, tid]
        );
        return result.rows[0];
    }

    static async findByTid(tid) {
        const result = await db.query(
            'SELECT * FROM transactions WHERE tid = $1',
            [tid]
        );
        return result.rows[0];
    }
}

module.exports = Transaction; 