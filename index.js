// const express = require('express');
// const bodyParser = require('body-parser');
// const { Client } = require('pg');
// const { Telegraf, Markup } = require('telegraf');
// const dotenv = require('dotenv');
// const axios = require('axios');

// dotenv.config();

// const BOT_TOKEN = process.env.BOT_TOKEN;
// const BANK_INFO = {
//     account: process.env.BANK_ACCOUNT,
//     account_name: process.env.BANK_ACCOUNT_NAME,
//     name: process.env.BANK_NAME,
// };

// const bot = new Telegraf(BOT_TOKEN);
// const app = express();

// const dbClient = new Client({
//     connectionString: process.env.DATABASE_URL,
//     ssl: false
// });

// dbClient.connect()
//     .then(() => console.log('Connected to PostgreSQL database.'))
//     .catch((err) => console.error('Failed to connect to PostgreSQL database:', err));

// app.use(bodyParser.json());

// // Function to create the main menu keyboard
// function getMainMenuKeyboard() {
//     return Markup.keyboard([
//         ["👤 Account", "💸 Deposit"],
//         ["🔍 Track", "🛒 Order Now"],
//         ["♻️ Refill", "🎒 My Bag"],
//         ["🔥 More", "📞 Support"]
//     ]).resize();
// }

// // Function to create the additional menu keyboard
// function getAdditionalMenuKeyboard() {
//     return Markup.keyboard([
//         ["❤️ Rate Us", "🔄 Update", "🌐 Statistics"],
//         ["🎁 Bonus", "🎗 Redeem", "👫 Referral"],
//         ["⬅️ Back"]
//     ]).resize();
// }

// // Initialize tables
// function initializeUsersTable() {
//     const query = `
//         CREATE TABLE IF NOT EXISTS users (
//                                              user_id TEXT PRIMARY KEY,
//                                              username TEXT,
//                                              balance REAL DEFAULT 0,
//                                              aff_code TEXT,
//                                              aff_link TEXT,
//                                              referrer_by TEXT DEFAULT NULL
//         )`;

//     dbClient.query(query, (err) => {
//         if (err) {
//             console.error('Error initializing users table:', err);
//         } else {
//             console.log('Users table initialized.');
//         }
//     });
// }

// function initializeOrdersTable() {
//     const query = `
//         CREATE TABLE IF NOT EXISTS orders (
//                                               order_id SERIAL PRIMARY KEY,
//                                               api_order_id TEXT,
//                                               user_id TEXT,
//                                               service_type TEXT,
//                                               link TEXT,
//                                               quantity INTEGER,
//                                               server TEXT,
//                                               total_cost REAL,
//                                               provider TEXT,
//                                               api_endpoint TEXT,
//                                               status TEXT DEFAULT 'Pending',
//                                               created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//         )`;

//     dbClient.query(query, (err) => {
//         if (err) {
//             console.error('Error initializing orders table:', err);
//         } else {
//             console.log('Orders table initialized.');
//         }
//     });
// }

// // User and order handling functions
// function saveUserToDb(userProfile) {
//     const query = `
//         INSERT INTO users (user_id, username, balance, aff_code, aff_link, referrer_by)
//         VALUES ($1, $2, $3, $4, $5, $6)
//             ON CONFLICT (user_id) DO UPDATE SET
//             username = EXCLUDED.username,
//                                          balance = EXCLUDED.balance,
//                                          aff_code = EXCLUDED.aff_code,
//                                          aff_link = EXCLUDED.aff_link,
//                                          referrer_by = EXCLUDED.referrer_by
//     `;
//     const values = [
//         userProfile.user_id,
//         userProfile.username,
//         userProfile.balance,
//         userProfile.aff_code,
//         userProfile.aff_link,
//         userProfile.referrer_by
//     ];

//     dbClient.query(query, values, (err) => {
//         if (err) {
//             console.error('Error saving user to database:', err);
//         } else {
//             console.log(`User ${userProfile.username} saved to database.`);
//         }
//     });
// }

// function getUserFromDb(userId, callback) {
//     const query = 'SELECT * FROM users WHERE user_id = $1';
//     dbClient.query(query, [userId], (err, res) => {
//         if (err) {
//             console.error('Error fetching user from database:', err);
//         } else {
//             callback(res.rows[0]);
//         }
//     });
// }

// function generateAffiliateCode() {
//     return Math.random().toString(36).substring(2, 8).toUpperCase();
// }

// function getUserProfile(userId, username, referrerBy, callback) {
//     getUserFromDb(userId, (user) => {
//         if (user) {
//             callback(user);
//         } else {
//             const affCode = generateAffiliateCode();
//             const newUser = {
//                 user_id: userId,
//                 username: username || 'Unknown',
//                 balance: 0,
//                 aff_code: affCode,
//                 aff_link: `t.me/tikupprobot?start=${affCode}`,
//                 referrer_by: referrerBy,
//             };
//             saveUserToDb(newUser);
//             callback(newUser);
//         }
//     });
// }

// // Create QR Code with amount
// function createQrCodeWithAmount(userId, amount) {
//     const customDescription = `TIKUP${userId}`;
//     return `https://img.vietqr.io/image/${BANK_INFO.name}-${BANK_INFO.account}-compact.png?amount=${amount}&addInfo=${customDescription}&accountName=${BANK_INFO.account_name}`;
// }

// // Start command to display the main menu
// bot.start((ctx) => {
//     const args = ctx.message.text.split(' ');
//     const referrerBy = args.length > 1 ? args[1] : null;
//     const userId = ctx.from.id;
//     const username = ctx.from.username;

//     getUserProfile(userId, username, referrerBy, () => {
//         ctx.reply(
//             "👋 Welcome to the bot! Choose an option below:",
//             getMainMenuKeyboard()
//         );
//     });
// });

// // Add handlers for each menu option
// bot.hears("👤 Account", (ctx) => {
//     const userId = ctx.from.id;
//     getUserFromDb(userId, (user) => {
//         if (user) {
//             ctx.reply(
//                 `👤 **Account Info**
// Username: ${user.username}
// User ID: ${user.user_id}
// Balance: ${user.balance.toLocaleString()}₫`,
//                 { parse_mode: "Markdown" }
//             );
//         } else {
//             ctx.reply("❌ Account information not found.");
//         }
//     });
// });

// bot.hears("💸 Deposit", (ctx) => {
//     ctx.reply("💵 Choose an amount to deposit:", Markup.inlineKeyboard([
//         [Markup.button.callback("20,000₫", "funds_20000"), Markup.button.callback("50,000₫", "funds_50000")],
//         [Markup.button.callback("200,000₫", "funds_200000"), Markup.button.callback("500,000₫", "funds_500000")],
//         [Markup.button.callback("1,000,000₫", "funds_1000000")]
//     ]));
// });

// // Handle Funds Selection
// bot.action(/funds_(\d+)/, async (ctx) => {
//     const amount = parseInt(ctx.match[1], 10);
//     const userId = ctx.from.id;
//     const qrCodeUrl = createQrCodeWithAmount(userId, amount);

//     try {
//         const qrImageBuffer = await axios.get(qrCodeUrl, { responseType: 'arraybuffer' });

//         await ctx.replyWithPhoto(
//             { source: Buffer.from(qrImageBuffer.data), filename: 'qrcode.png' },
//             {
//                 caption: `✅ Quét mã QR để thanh toán số tiền ${amount.toLocaleString()}₫:
// 🏦 Ngân hàng: ${BANK_INFO.name}
// 💳 Tên tài khoản: ${BANK_INFO.account_name}
// 🔢 Số tài khoản: ${BANK_INFO.account}
// 📋 Nội dung: TIKUP${userId}`
//             }
//         );


//         Markup.inlineKeyboard([
//                 [Markup.button.callback('❌ Hủy bỏ', 'go_back')]
//             ]
//         );
//     } catch (err) {
//         console.error('Error generating QR code:', err);
//         ctx.reply('❌ Không thể tạo mã QR. Vui lòng thử lại sau.');
//     }

// });

// // Handle Buy Services Button
// bot.action('buy_services', (ctx) => {
//     ctx.editMessageText('🛒 Chọn dịch vụ muốn sử dụng:', Markup.inlineKeyboard([
//         [Markup.button.callback('Tăng Follow Tiktok', 'tiktok_followers')],
//         [Markup.button.callback('🔙 Quay lại', 'go_back')]
//     ])).catch(() => {
//         ctx.reply('🛒 Chọn dịch vụ muốn sử dụng:', Markup.inlineKeyboard([
//             [Markup.button.callback('Tăng Follow Tiktok', 'tiktok_followers')],
//             [Markup.button.callback('🔙 Quay lại', 'go_back')]
//         ]));
//     });
// });
// // Handlers for additional menu options
// bot.hears("❤️ Rate Us", (ctx) => ctx.reply("Thank you for rating us!"));
// bot.hears("🔄 Update", (ctx) => ctx.reply("Checking for updates..."));
// bot.hears("🌐 Statistics", (ctx) => ctx.reply("Here are your statistics."));
// bot.hears("🎁 Bonus", (ctx) => ctx.reply("You have a new bonus!"));
// bot.hears("🎗 Redeem", (ctx) => ctx.reply("Redeem your rewards here."));
// bot.hears("👫 Referral", (ctx) => ctx.reply("Share your referral link to earn rewards."));

// // Add main menu handlers
// bot.hears("👤 Account", (ctx) => ctx.reply("👤 Here is your account information."));
// bot.hears("💸 Deposit", (ctx) => ctx.reply("💰 Select the amount you want to deposit."));
// bot.hears("🔍 Track", (ctx) => ctx.reply("🔍 Enter the order ID to track your order."));
// bot.hears("🛒 Order Now", (ctx) => ctx.reply("🛒 Choose a service to order."));
// bot.hears("♻️ Refill", (ctx) => ctx.reply("♻️ Refill options are not available yet."));
// bot.hears("🎒 My Bag", (ctx) => ctx.reply("🎒 Your bag is currently empty."));
// bot.hears("📞 Support", (ctx) => ctx.reply("📞 Contact support for assistance."));

// bot.hears("🔥 More", (ctx) => {
//     ctx.reply(
//         "Welcome to the additional menu!",
//         getAdditionalMenuKeyboard()
//     );
// });

// // Handle "Back" button to return to the main menu
// bot.hears("⬅️ Back", (ctx) => {
//     ctx.reply(
//         "Returning to the main menu.",
//         getMainMenuKeyboard()
//     );
// });

// bot.hears("📞 Support", (ctx) => {
//     ctx.reply("📞 Contact support for assistance.");
// });

// // Initialize tables and start the bot
// initializeUsersTable();
// initializeOrdersTable();
// bot.launch().then(() => console.log("Bot started successfully!"));
// app.listen(3000, () => console.log("App is running on port 3000"));
