require('dotenv').config();

module.exports = {
    CASSO: {
        API_KEY: process.env.CASSO_API_KEY,
        WEBHOOK_SECRET: process.env.CASSO_WEBHOOK_SECRET
    },
    
    PAYOS: {
        CLIENT_ID: process.env.PAYOS_CLIENT_ID,
        API_KEY: process.env.PAYOS_API_KEY,
        CHECKSUM_KEY: process.env.PAYOS_CHECKSUM_KEY
    },

    DARK_API: {
        URL: process.env.DARK_API_URL,
        CODE: process.env.DARK_API_CODE,
        TOKEN: process.env.DARK_API_TOKEN
    }
}; 