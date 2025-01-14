const express = require('express');
const bodyParser = require('body-parser');
const pool = require('./database');
const { Telegraf, Markup } = require('telegraf');
const dotenv = require('dotenv');
const axios = require('axios');

const {
    handleTiktokFollowers,
    handleServerSelection,
    handleMessage,
    handleOrderButtons
} = require('./tiktok.js');

dotenv.config();

// Environment configuration
const BOT_TOKEN = process.env.BOT_TOKEN;
const BANK_INFO = {
    account: process.env.BANK_ACCOUNT,
    account_name: process.env.BANK_ACCOUNT_NAME,
    name: process.env.BANK_NAME,
};

// Initialize Express app and Telegram bot
const bot = new Telegraf(BOT_TOKEN);
const app = express();

// Database connection pool
// const pool = new Pool({
//     connectionString: process.env.DATABASE_URL,
//     ssl: false,
//     max: 20,
//     idleTimeoutMillis: 30000,
//     connectionTimeoutMillis: 2000,
// });

// Middleware
app.use(bodyParser.json());

// Keyboard layouts
function getMainMenuKeyboard() {
    return Markup.keyboard([
        ["👤 Account", "💸 Deposit Now"],
        ["🔍 Track", "🛒 Order Now"],
        ["🎒 My Bag", "🔥 More"]
    ]).resize();
}

function getAdditionalMenuKeyboard() {
    return Markup.keyboard([
        ["❤️ Rate Us", "🔄 Update", "🌐 Statistics"],
        ["🎁 Bonus", "🎗 Redeem", "👫 Referral"],
        ["⬅️ Back"]
    ]).resize();
}

// Database initialization functions
async function initializeTables() {
    const usersTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            username TEXT,
            balance REAL DEFAULT 0,
            aff_code TEXT,
            aff_link TEXT,
            referrer_by TEXT DEFAULT NULL
        )`;

    const ordersTableQuery = `
        CREATE TABLE IF NOT EXISTS orders (
            order_id SERIAL PRIMARY KEY,
            api_order_id TEXT,
            user_id TEXT,
            service_type TEXT,
            link TEXT,
            quantity INTEGER,
            server TEXT,
            total_cost REAL,
            provider TEXT,
            api_endpoint TEXT,
            status TEXT DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;

    try {
        await pool.query(usersTableQuery);
        await pool.query(ordersTableQuery);
        console.log('Database tables initialized successfully');
    } catch (err) {
        console.error('Error initializing tables:', err);
        throw err;
    }
}

// User management functions
async function saveUserToDb(userProfile) {
    const query = `
        INSERT INTO users (user_id, username, balance, aff_code, aff_link, referrer_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id) DO UPDATE SET
            username = EXCLUDED.username,
            balance = EXCLUDED.balance,
            aff_code = EXCLUDED.aff_code,
            aff_link = EXCLUDED.aff_link,
            referrer_by = EXCLUDED.referrer_by
        RETURNING *
    `;

    const values = [
        userProfile.user_id,
        userProfile.username,
        userProfile.balance,
        userProfile.aff_code,
        userProfile.aff_link,
        userProfile.referrer_by
    ];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error saving user to database:', err);
        throw err;
    }
}

async function getUserFromDb(userId) {
    try {
        const result = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
        return result.rows[0];
    } catch (err) {
        console.error('Error fetching user from database:', err);
        throw err;
    }
}

function generateAffiliateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function getUserProfile(userId, username, referrerBy) {
    try {
        let user = await getUserFromDb(userId);

        if (!user) {
            const affCode = generateAffiliateCode();
            const newUser = {
                user_id: userId,
                username: username || 'Unknown',
                balance: 0,
                aff_code: affCode,
                aff_link: `t.me/tikupprobot?start=${affCode}`,
                referrer_by: referrerBy,
            };
            user = await saveUserToDb(newUser);
        }

        return user;
    } catch (err) {
        console.error('Error in getUserProfile:', err);
        throw err;
    }
}

// QR Code generation
function createQrCodeWithAmount(userId, amount) {
    const customDescription = `TIKUP${userId}`;
    return `https://img.vietqr.io/image/${BANK_INFO.name}-${BANK_INFO.account}-compact.png?amount=${amount}&addInfo=${customDescription}&accountName=${BANK_INFO.account_name}`;
}

// Bot command handlers
bot.start(async (ctx) => {
    try {
        const args = ctx.message.text.split(' ');
        const referrerBy = args.length > 1 ? args[1] : null;
        const userId = ctx.from.id;
        const username = ctx.from.username;

        const user = await getUserProfile(userId, username, referrerBy);

        await ctx.replyWithHTML(
            `👋 <b>Welcome</b> <i>${username}</i> <b>to our community!</b>\n\n` +
            `💸 <b>Deposit Now</b><i> To Get Started</i>`,
            getMainMenuKeyboard()
        );
    } catch (err) {
        console.error('Error in start command:', err);
        await ctx.reply('An error occurred. Please try again.');
    }
});

bot.hears("👤 Account", async (ctx) => {
    try {
        const userId = ctx.from.id;
        const user = await getUserFromDb(userId);

        if (user) {
            await ctx.replyWithHTML(
                `👤 <b>User:</b> <a href="https://simthue.biz">${user.username}</a>\n` +
                `👋 <b>Username:</b> @${user.username}\n` +
                `🆔 <b>User ID:</b> <code>${user.user_id}</code>\n` +
                `💰 <b>Balance:</b> ${user.balance.toLocaleString()}đ`
            );
        } else {
            await ctx.reply("❌ Account information not found.");
        }
    } catch (err) {
        console.error('Error in account command:', err);
        await ctx.reply('An error occurred. Please try again.');
    }
});

bot.hears("💸 Deposit Now", (ctx) => {
    ctx.reply("💵 Choose an amount to deposit", Markup.inlineKeyboard([
        [Markup.button.callback("20,000₫", "funds_20000"), Markup.button.callback("50,000₫", "funds_50000")],
        [Markup.button.callback("200,000₫", "funds_200000"), Markup.button.callback("500,000₫", "funds_500000")],
        [Markup.button.callback("1,000,000₫", "funds_1000000")]
    ]));
});

bot.action(/funds_(\d+)/, async (ctx) => {
    try {
        const amount = parseInt(ctx.match[1], 10);
        const userId = ctx.from.id;
        const qrCodeUrl = createQrCodeWithAmount(userId, amount);

        const qrImageBuffer = await axios.get(qrCodeUrl, { responseType: 'arraybuffer' });

        await ctx.replyWithPhoto(
            { source: Buffer.from(qrImageBuffer.data), filename: 'qrcode.png' },
            {
                caption: `✅ <b>Quét mã QR để thanh toán số tiền:</b> <i>${amount.toLocaleString()}₫</i>\n\n` +
                    `🏦 <b>Ngân hàng:</b> ${BANK_INFO.name}\n` +
                    `💳 <b>Tên tài khoản:</b> ${BANK_INFO.account_name}\n` +
                    `🔢 <b>Số tài khoản:</b> ${BANK_INFO.account}\n` +
                    `📋 <b>Nội dung:</b> <code>TIKUP${userId}</code>`,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '❌ Hủy bỏ', callback_data: `cancel_${userId}_${amount}` }]
                    ]
                }
            }
        );
    } catch (err) {
        console.error('Error generating QR code:', err);
        await ctx.reply('❌ Không thể tạo mã QR. Vui lòng thử lại sau.');
    }
});

bot.action(/cancel_(.+)_(.+)/, async (ctx) => {
    try {
        await ctx.deleteMessage();
        await ctx.answerCbQuery();
        await ctx.reply('❌ Giao dịch đã được hủy bỏ.');
    } catch (err) {
        console.error('Error canceling transaction:', err);
        await ctx.reply('❌ Không thể hủy giao dịch. Vui lòng thử lại sau.');
    }
});

bot.hears("🛒 Order Now", async (ctx) => {
    try {
        await ctx.editMessageText('🛒 Chọn dịch vụ muốn sử dụng', Markup.inlineKeyboard([
            [Markup.button.callback('Tăng Follow Tiktok', 'tiktok_followers')],
        ]));
    } catch (err) {
        await ctx.reply('🛒 Chọn dịch vụ muốn sử dụng:', Markup.inlineKeyboard([
            [Markup.button.callback('Tăng Follow Tiktok', 'tiktok_followers')],
        ]));
    }
});

bot.action('tiktok_followers', handleTiktokFollowers);
bot.action(/server_(.+)/, handleServerSelection);
bot.action(/(confirm|cancel)_(.+)/, handleOrderButtons);
// bot.on('text', handleMessage);

// Additional menu handlers
bot.hears("❤️ Rate Us", ctx => ctx.reply("Thank you for rating us!"));
bot.hears("🔄 Update", ctx => ctx.reply("Checking for updates..."));
bot.hears("🌐 Statistics", ctx => ctx.reply("Here are your statistics."));
bot.hears("🎁 Bonus", ctx => ctx.reply("You have a new bonus!"));
bot.hears("🎗 Redeem", ctx => ctx.reply("Redeem your rewards here."));
bot.hears("👫 Referral", ctx => ctx.reply("Share your referral link to earn rewards."));

bot.hears("🔍 Track", async (ctx) => {
    await ctx.reply('🔍 Nhập mã đơn hàng để kiểm tra trạng thái:');
});

bot.hears("🎒 My Bag", async (ctx) => {
    try {
        const userId = ctx.from.id;

        // Lấy thông tin đơn hàng từ database
        const result = await pool.query(
            'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
            [userId]
        );

        if (result.rows.length === 0) {
            await ctx.reply('🎒 Túi của bạn hiện đang trống.');
            return;
        }

        let message = '🎒 Đơn hàng gần đây:\n\n';
        result.rows.forEach((order, index) => {
            message += `#${index + 1} 🆔 Mã đơn: ${order.order_id}\n` +
                `🔗 Link: ${order.link}\n` +
                `👥 Số lượng: ${order.quantity}\n` +
                `💰 Tổng tiền: ${order.total_cost.toLocaleString()}đ\n` +
                `⏳ Trạng thái: ${order.status}\n\n`;
        });

        await ctx.reply(message);
    } catch (error) {
        console.error('Error fetching My Bag:', error);
        await ctx.reply('❌ Có lỗi xảy ra khi lấy thông tin túi. Vui lòng thử lại sau.');
    }
});

bot.hears("🔥 More", ctx => {
    ctx.reply("Welcome to the additional menu!", getAdditionalMenuKeyboard());
});

bot.hears("⬅️ Back", ctx => {
    ctx.reply("Returning to the main menu.", getMainMenuKeyboard());
});

// Error handling
bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply('An error occurred. Please try again later.');
});

// Graceful shutdown
process.once('SIGINT', () => {
    bot.stop('SIGINT');
    pool.end();
});
process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
    pool.end();
});

// Start the application
async function startApp() {
    try {
        await initializeTables();
        await bot.launch();
        console.log('Bot started successfully!');

        app.listen(3000, () => {
            console.log('App is running on port 3000');
        });
    } catch (err) {
        console.error('Failed to start application:', err);
        process.exit(1);
    }
}

startApp();