const axios = require('axios');
const { API_TOKEN, API_URL, STATUS_MAP } = require('../../config/constants');

class HacklikeApi {
    static async checkOrderStatus(apiOrderId) {
        try {
            const formData = new URLSearchParams();
            formData.append('key', API_TOKEN);
            formData.append('action', 'status');
            formData.append('order', apiOrderId);

            const response = await axios.post(API_URL, formData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            const orderData = response.data[apiOrderId];
            if (!orderData) {
                throw new Error('Order not found in response');
            }

            return {
                status: STATUS_MAP[orderData.status] || orderData.status,
                startCount: parseInt(orderData.start_count) || 0,
                remains: parseInt(orderData.remains) || 0,
                charge: parseFloat(orderData.charge) || 0
            };
        } catch (error) {
            console.error('API Error:', error.message);
            throw error;
        }
    }

    static async placeOrder(orderData) {
        try {
            const formData = new URLSearchParams();
            formData.append('key', API_TOKEN);
            formData.append('action', 'add');
            formData.append('service', orderData.serviceId);
            formData.append('link', orderData.link);
            formData.append('quantity', orderData.quantity);

            const response = await axios.post(API_URL, formData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            if (response.data.error) {
                throw new Error(response.data.error);
            }

            return response.data.order;
        } catch (error) {
            console.error('Place order error:', error);
            throw error;
        }
    }
}

module.exports = HacklikeApi; 