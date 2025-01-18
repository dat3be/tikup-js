require('dotenv').config();
const bot = require('./src/config/telegram');
const Logger = require('./src/utils/logger');
const initDatabase = require('./src/database/init');

// Import Controllers
const UserController = require('./src/controllers/userController');
const OrderController = require('./src/controllers/orderController');
const PaymentController = require('./src/controllers/paymentController');
const ReferralController = require('./src/controllers/referralController');

// Import Middlewares
const AuthMiddleware = require('./src/middlewares/auth');
const RateLimiter = require('./src/middlewares/rateLimit');
const StateManager = require('./src/middlewares/state');

// Import Services
const OrderService = require('./src/services/orderService');
const MainMenu = require('./src/keyboards/mainMenu');

// Initialize database
initDatabase().catch(error => {
    Logger.error('Database initialization failed:', error);
    process.exit(1);
});

// Apply middlewares
bot.use(AuthMiddleware.authenticate);
bot.use(RateLimiter.middleware());
bot.use(StateManager.middleware());

// Command handlers
bot.command('start', UserController.handleStart);
bot.command('help', ctx => ctx.reply(
    '📌 Danh sách lệnh:\n' +
    '/start - Khởi động bot\n' +
    '/help - Xem trợ giúp\n' +
    '🔍 Track - Kiểm tra đơn hàng\n' +
    '💸 Deposit - Nạp tiền\n' +
    '🛒 Order - Đặt đơn mới'
));

// Menu handlers
bot.hears('👤 Account', UserController.handleAccount);
bot.hears('👫 Referral', ReferralController.handleReferral);
bot.hears('💸 Deposit Now', AuthMiddleware.requireAuth, PaymentController.handleDeposit);
bot.hears('🔍 Track', AuthMiddleware.requireAuth, (ctx) => {
    ctx.state.setState({ isTracking: true });
    ctx.reply('🔍 Vui lòng nhập mã đơn hàng cần kiểm tra:');
});
bot.hears('🛒 Order Now', AuthMiddleware.requireAuth, OrderController.handleOrderStart);
bot.hears('🎒 My Bag', AuthMiddleware.requireAuth, UserController.handleBag);

// Handle More button
bot.hears('🔥 More', (ctx) => {
    ctx.reply('Chọn tính năng bổ sung:', MainMenu.getAdditionalMenuKeyboard());
});

// Handle Back button from additional menu
bot.hears('⬅️ Back', (ctx) => {
    ctx.reply('Chọn chức năng từ menu:', MainMenu.getMainMenuKeyboard());
});

// Text handler for tracking
bot.on('text', async (ctx, next) => {
    const state = ctx.state.getState();
    if (state?.isTracking) {
        await OrderController.handleTracking(ctx);
        ctx.state.clearState();
        return;
    }
    return next();
});

// Handle deposit amount selection
bot.on('text', async (ctx, next) => {
    // Ignore back button as it's handled above
    if (ctx.message.text === '⬅️ Back') {
        return;
    }

    const state = ctx.state.getState();
    if (state?.isSelectingAmount) {
        await PaymentController.handleAmountSelection(ctx);
        return;
    }
    return next();
});

// Webhook handler for payments
const express = require('express');
const app = express();
app.use(express.json());

app.post('/webhook/payment', PaymentController.handleWebhook);

// Handle callback queries
bot.action('cancel_payment', PaymentController.handleCancelPayment);
bot.action(/^check_payment_(\d+)$/, PaymentController.handleCheckPayment);

// Handle referral actions
bot.action('show_referral', async (ctx) => {
    await ctx.answerCbQuery();
    await ReferralController.handleReferral(ctx);
});

bot.action('activate_referral', async (ctx) => {
    await ctx.answerCbQuery();
    await ReferralController.handleActivation(ctx);
});

bot.action('cancel_referral', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('❌ Đã hủy tham gia chương trình giới thiệu.');
});

// Handle bank info input
bot.on('text', async (ctx) => {
    if (ctx.session?.awaitingBankInfo) {
        await ReferralController.handleBankInfo(ctx);
    }
    // ... other text handlers ...
});

// Start bot and server
const PORT = process.env.PORT || 3000;

const start = async () => {
    try {
        // Start periodic order status updates
        setInterval(() => {
            OrderService.checkAndUpdateOrders()
                .catch(err => Logger.error('Order update error:', err));
        }, 5 * 60 * 1000); // Every 5 minutes

        // Start rate limiter cleanup
        RateLimiter.startCleanup();

        // Start Express server
        app.listen(PORT, () => {
            Logger.info(`Server is running on port ${PORT}`);
        });

        // Start bot
        await bot.launch();
        Logger.info('Bot has been started');

        // Enable graceful stop
        process.once('SIGINT', () => bot.stop('SIGINT'));
        process.once('SIGTERM', () => bot.stop('SIGTERM'));
    } catch (error) {
        Logger.error('Startup error:', error);
        process.exit(1);
    }
};

start();