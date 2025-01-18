const { Telegraf } = require('telegraf');
const { BOT_TOKEN } = require('./constants');

if (!BOT_TOKEN) {
    throw new Error('BOT_TOKEN must be provided!');
}

const bot = new Telegraf(BOT_TOKEN);

// Basic error handling
bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply('❌ Đã xảy ra lỗi. Vui lòng thử lại sau.');
});

module.exports = bot; 