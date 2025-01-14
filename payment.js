const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const { Telegraf } = require('telegraf');
const axios = require('axios');
const crypto = require('crypto');
const winston = require('winston'); // For logging

dotenv.config();

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'payment.log' })
    ]
});

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);
const PORT = 3333;

const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

// Middleware
app.use(bodyParser.json());

// Initialize Tables
async function initializeTables() {
    const queries = [
        `CREATE TABLE IF NOT EXISTS transactions (
            transaction_id TEXT PRIMARY KEY,
            tid TEXT UNIQUE,
            amount REAL,
            description TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            user_id TEXT,
            status TEXT DEFAULT 'Pending'
        )`,
        `CREATE TABLE IF NOT EXISTS reminders (
            user_id TEXT,
            tid TEXT UNIQUE,
            amount REAL,
            description TEXT,
            reminder_sent BOOLEAN DEFAULT false,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    ];

    for (const query of queries) {
        try {
            await dbPool.query(query);
            logger.info('Table initialized:', query);
        } catch (error) {
            logger.error('Error initializing table:', error);
        }
    }
}

// Save Reminder
async function saveReminder(userId, tid, amount, description) {
    try {
        const query = `INSERT INTO reminders (user_id, tid, amount, description) VALUES ($1, $2, $3, $4) ON CONFLICT (tid) DO NOTHING`;
        await dbPool.query(query, [userId, tid, amount, description]);
    } catch (error) {
        logger.error('Error saving reminder:', error);
    }
}

// Send Reminder
async function sendReminder(userId, amount, description) {
    try {
        await bot.telegram.sendMessage(
            userId,
            `🔔 Nhắc nhở: Bạn chưa hoàn tất giao dịch với số tiền ${amount.toLocaleString()}₫.\n📝 Nội dung: ${description}\nVui lòng hoàn tất thanh toán để tránh bị hủy.`
        );
    } catch (error) {
        logger.error(`Failed to send reminder to user ${userId}:`, error);
    }
}

// Check and Send Reminders
async function checkAndSendReminders() {
    setInterval(async () => {
        try {
            const query = `SELECT user_id, tid, amount, description FROM reminders WHERE reminder_sent = false AND timestamp < NOW() - INTERVAL '10 minutes'`;
            const res = await dbPool.query(query);
            for (const row of res.rows) {
                await sendReminder(row.user_id, row.amount, row.description);
                await dbPool.query('UPDATE reminders SET reminder_sent = true WHERE tid = $1', [row.tid]);
            }
        } catch (error) {
            logger.error('Error checking and sending reminders:', error);
        }
    }, 60000);
}

// Add Transaction
async function addTransaction(tid, amount, description, userId) {
    try {
        const transactionId = crypto.randomBytes(16).toString('hex');
        const query = `INSERT INTO transactions (transaction_id, tid, amount, description, user_id) VALUES ($1, $2, $3, $4, $5)`;
        await dbPool.query(query, [transactionId, tid, amount, description, userId]);
    } catch (error) {
        logger.error('Error adding transaction:', error);
    }
}

// Update Transaction Status
async function updateTransactionStatus(tid, status) {
    try {
        const query = `UPDATE transactions SET status = $1 WHERE tid = $2`;
        await dbPool.query(query, [status, tid]);
    } catch (error) {
        logger.error('Error updating transaction status:', error);
    }
}

// Update User Balance
async function updateUserBalance(userId, amount) {
    try {
        const query = `UPDATE users SET balance = balance + $1 WHERE user_id = $2`;
        await dbPool.query(query, [amount, userId]);
    } catch (error) {
        logger.error('Error updating user balance:', error);
    }
}

// Notify User
async function notifyUser(userId, message) {
    try {
        await bot.telegram.sendMessage(userId, message);
    } catch (error) {
        logger.error(`Failed to notify user ${userId}:`, error);
    }
}

// Parse User ID from Description
function parseUserIdFromDescription(description) {
    const match = description.match(/TIKUP(\d+)/);
    return match ? match[1] : null;
}

// Webhook to Handle Notifications
app.post('/webhook', async (req, res) => {
    try {
        const secureToken = req.headers['secure-token'];
        if (secureToken !== process.env.CASSO_WEBHOOK_SECRET) {
            logger.warn('Invalid webhook token');
            return res.status(400).send('Invalid token');
        }

        const transactions = req.body.data || [];
        for (const tx of transactions) {
            const { tid, amount, description } = tx;
            const userId = parseUserIdFromDescription(description);

            if (!tid || !userId) {
                logger.warn('Invalid transaction data:', tx);
                continue;
            }

            await saveReminder(userId, tid, parseFloat(amount), description);

            const query = `SELECT 1 FROM transactions WHERE tid = $1`;
            const { rowCount } = await dbPool.query(query, [tid]);

            if (rowCount === 0) {
                await addTransaction(tid, parseFloat(amount), description, userId);
                await updateTransactionStatus(tid, 'Completed');
                await updateUserBalance(userId, parseFloat(amount));
                notifyUser(userId, `🎉 Giao dịch thành công!\n💵 Số tiền: ${parseFloat(amount).toLocaleString()}₫\n💰 Số dư hiện tại: Vui lòng kiểm tra tài khoản.`);
            }
        }

        res.status(200).send('OK');
    } catch (error) {
        logger.error('Error processing webhook:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Start Server
initializeTables();
checkAndSendReminders();
app.listen(PORT, () => {
    logger.info(`Payment service running on port ${PORT}`);
});
