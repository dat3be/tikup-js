const express = require('express');
const bodyParser = require('body-parser');
const Logger = require('../utils/logger');
const TransactionController = require('../controllers/transactionController');
const User = require('../models/user');

class PaymentServer {
    constructor() {
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(bodyParser.json());
        this.app.use((req, res, next) => {
            Logger.info(`${req.method} ${req.url}`);
            next();
        });
    }

    // Lấy user_id từ description
    extractUserId(description) {
        try {
            const match = description.match(/TIKUP(\d+)/i);
            return match ? match[1] : null;
        } catch (error) {
            return null;
        }
    }

    setupRoutes() {
        this.app.post('/webhook/casso', async (req, res) => {
            try {
                const { error, data } = req.body;
                
                if (error !== 0 || !data || !Array.isArray(data)) {
                    Logger.error('Invalid webhook data', { error, data });
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Invalid data format' 
                    });
                }

                Logger.info('Processing Casso webhook data', { data });

                // Xử lý từng giao dịch
                for (const transaction of data) {
                    try {
                        const userId = this.extractUserId(transaction.description);
                        
                        if (!userId) {
                            Logger.error('Could not extract user ID from description', { 
                                description: transaction.description 
                            });
                            continue;
                        }

                        Logger.info('Processing transaction', {
                            userId,
                            amount: transaction.amount,
                            tid: transaction.tid
                        });

                        // Xử lý giao dịch và gửi thông báo
                        await TransactionController.handleDeposit(
                            userId,
                            transaction.amount,
                            transaction.tid,
                            {
                                bank_name: transaction.bankName,
                                bank_account: transaction.subAccId
                            }
                        );

                    } catch (transactionError) {
                        Logger.error('Error processing transaction', {
                            error: transactionError.message,
                            stack: transactionError.stack,
                            transaction
                        });
                        continue;
                    }
                }

                res.json({ success: true });
            } catch (error) {
                Logger.error('Webhook processing error', { 
                    error: error.message,
                    stack: error.stack 
                });
                res.status(500).json({ 
                    success: false, 
                    message: error.message 
                });
            }
        });

        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok' });
        });
    }

    start(port = 3333) {
        this.app.listen(port, () => {
            Logger.info('Payment server started', { port });
        });
    }
}

module.exports = new PaymentServer();
