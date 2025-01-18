const express = require('express');
const bodyParser = require('body-parser');
const Logger = require('../utils/logger');
const TransactionController = require('../controllers/transactionController');

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

    setupRoutes() {
        // Casso webhook
        this.app.post('/webhook/casso', async (req, res) => {
            try {
                const { error, data } = req.body;
                
                if (error) {
                    Logger.error('Casso webhook error:', error);
                    return res.status(400).json({ success: false, message: error });
                }

                Logger.info('Received Casso webhook:', data);

                // Xử lý từng giao dịch
                for (const transaction of data.data) {
                    const userId = transaction.description.replace('TIKUP', '');
                    await TransactionController.handleDeposit(
                        userId,
                        transaction.amount,
                        transaction.tid
                    );
                }

                res.json({ success: true });
            } catch (error) {
                Logger.error('Webhook processing error:', error);
                res.status(500).json({ success: false, message: error.message });
            }
        });

        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok' });
        });
    }

    start(port = 3333) {
        this.app.listen(port, () => {
            Logger.info(`Payment service running on port ${port}`);
        });
    }
}

module.exports = new PaymentServer(); 