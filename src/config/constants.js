require('dotenv').config();

module.exports = {
    // Bot Configuration
    BOT_TOKEN: process.env.BOT_TOKEN,

    // API Configuration
    API_TOKEN: process.env.API_TOKEN,
    API_URL: 'https://hacklike17.com/api/v2',

    // Bank Information
    BANK_INFO: {
        account: process.env.BANK_ACCOUNT,
        account_name: process.env.BANK_ACCOUNT_NAME,
        name: process.env.BANK_NAME,
    },

    // Payment Configuration
    CASSO_WEBHOOK_SECRET: process.env.CASSO_WEBHOOK_SECRET,

    // Service Configuration
    SERVERS: {
        '1': { name: 'Máy chủ 1 - Nhanh', cost: 250, id: 'server_1' },
        '2': { name: 'Máy chủ 2 - Chậm', cost: 150, id: 'server_6' }
    },

    // Status Mapping
    STATUS_MAP: {
        'Processing': 'Đang xử lý',
        'In progress': 'Đang tiến hành',
        'Completed': 'Hoàn thành',
        'Canceled': 'Đã hủy',
        'Refunded': 'Hoàn tiền',
        'Waiting Cancel': 'Chờ hủy',
        'Pending': 'Chờ xử lý'
    }
}; 