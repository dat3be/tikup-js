require('dotenv').config();
const paymentServer = require('./services/paymentServer');
const Logger = require('./utils/logger');
const initDatabase = require('./database/init');

async function startPaymentService() {
    try {
        // Khởi tạo database
        await initDatabase();
        Logger.info('Database initialized');

        // Khởi động payment server
        paymentServer.start(process.env.PAYMENT_PORT || 3333);
    } catch (error) {
        Logger.error('Failed to start payment service:', error);
        process.exit(1);
    }
}

startPaymentService(); 