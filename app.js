require('dotenv').config();
const bot = require('./src/config/telegram');
const Logger = require('./src/utils/logger');
const initDatabase = require('./src/database/init');

// Import Controllers
const StartController = require('./src/controllers/startController');
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
const SchedulerService = require('./src/services/schedulerService');

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
bot.command('start', StartController.handleStart);

// Menu handlers
bot.hears('👤 Account', UserController.handleAccount);
bot.hears('👫 Referral', ReferralController.handleReferral);
bot.hears('💸 Deposit Now', AuthMiddleware.requireAuth, PaymentController.handleDeposit);
bot.hears('🔍 Track', AuthMiddleware.requireAuth, (ctx) => {
    ctx.state.setState({ type: 'tracking', step: 'waiting_order_id' });
    ctx.reply('🔍 Vui lòng nhập mã đơn hàng cần kiểm tra:');
});

// Order System
bot.hears('🛒 Order Now', AuthMiddleware.requireAuth, async (ctx) => {
    ctx.state.setState({ type: 'order', step: 'selecting_service' });
    await OrderController.handleOrderStart(ctx);
});

// Text handler for ordering and tracking
bot.on('text', async (ctx, next) => {
    const state = ctx.state.getState();
    
    // Handle order flow
    if (state?.type === 'order') {
        await OrderController.handleText(ctx);
        return;
    }
    
    // Handle tracking flow
    if (state?.type === 'tracking' || state?.isTracking) {
        await OrderController.handleTracking(ctx);
        return;
    }
    
    return next();
});

// My Bag
bot.hears('🎒 My Bag', AuthMiddleware.requireAuth, UserController.handleBag);

// Handle More button
bot.hears('🔥 More', (ctx) => {
    ctx.reply('Chọn tính năng bổ sung:', MainMenu.getAdditionalMenuKeyboard());
});

// Handle Back button from additional menu
bot.hears('⬅️ Back', (ctx) => {
    ctx.reply('Chọn chức năng từ menu:', MainMenu.getMainMenuKeyboard());
});

// Handle deposit amount selection
bot.on('text', async (ctx, next) => {
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

// Admin commands
bot.command('restart', AuthMiddleware.requireAdmin, async (ctx) => {
    try {
        await ctx.reply('🔄 Đang khởi động lại bot...');
        
        // Clear all states
        StateManager.clearAllStates();
    
        await ctx.reply('✅ Bot đã được khởi động lại thành công!');
        
        Logger.info('Bot restarted by admin:', {
            admin_id: ctx.from.id,
            timestamp: new Date()
        });

    } catch (error) {
        Logger.error('Restart error:', error);
        await ctx.reply('❌ Có lỗi xảy ra khi khởi động lại bot.');
    }
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

        // Khởi động scheduler
        SchedulerService.start();
    } catch (error) {
        Logger.error('Startup error:', error);
        process.exit(1);
    }
};

start();