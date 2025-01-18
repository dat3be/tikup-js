const { Markup } = require('telegraf');

class MainMenu {
    static getMainMenuKeyboard() {
        return Markup.keyboard([
            ["👤 Account", "💸 Deposit Now"],
            ["🔍 Track", "🛒 Order Now"],
            ["🎒 My Bag", "🔥 More"]
        ]).resize();
    }

    static getAdditionalMenuKeyboard() {
        return Markup.keyboard([
            ["❤️ Rate Us", "🔄 Update", "🌐 Statistics"],
            ["🎁 Bonus", "🎗 Redeem", "👫 Referral"],
            ["⬅️ Back"]
        ]).resize();
    }

    static getBackKeyboard() {
        return Markup.keyboard([["⬅️ Back"]]).resize();
    }

    static getOrderMenuKeyboard() {
        return Markup.keyboard([
            ["✅ Confirm", "❌ Cancel"],
            ["⬅️ Back"]
        ]).resize();
    }

    static getDepositAmountKeyboard() {
        return Markup.keyboard([
            ["20,000đ", "50,000đ"],
            ["100,000đ", "200,000đ"],
            ["⬅️ Back"]
        ]).resize();
    }
}

module.exports = MainMenu; 