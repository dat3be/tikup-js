require('dotenv').config();
const Logger = require('./src/utils/logger');
const initDatabase = require('./src/database/init');
const paymentServer = require('./src/services/paymentServer');

async function startPaymentServer() {
    try {
        // Khởi tạo database
        await initDatabase();
        Logger.info('Database initialized for payment service');

        // Start payment server
        paymentServer.start();
        
    } catch (error) {
        Logger.error('Payment server startup error:', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
}

// Xử lý uncaught exceptions
process.on('uncaughtException', (error) => {
    Logger.error('Uncaught Exception:', {
        error: error.message,
        stack: error.stack
    });
    process.exit(1);
});

// Xử lý unhandled rejections
process.on('unhandledRejection', (error) => {
    Logger.error('Unhandled Rejection:', {
        error: error.message,
        stack: error.stack
    });
    process.exit(1);
});

startPaymentServer(); 