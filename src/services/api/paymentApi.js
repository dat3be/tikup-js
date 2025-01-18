const axios = require('axios');
const { DARK_API } = require('../../config/payment');

class PaymentApi {
    static async verifyTransaction(transactionData) {
        try {
            const response = await axios.post(DARK_API.URL, {
                code: DARK_API.CODE,
                token: DARK_API.TOKEN,
                ...transactionData
            });

            return response.data;
        } catch (error) {
            console.error('Payment verification error:', error);
            throw error;
        }
    }
}

module.exports = PaymentApi; 