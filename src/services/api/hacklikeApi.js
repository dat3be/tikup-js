const axios = require('axios');
const Logger = require('../../utils/logger');

const API_URL = process.env.API_URL;
const API_V2_URL = process.env.API_URL + 'v2/';
const API_TOKEN = process.env.API_TOKEN;

class HacklikeApi {
    constructor() {
        this.api = axios.create({
            baseURL: process.env.API_URL,
            timeout: 10000,
            headers: {
                'Authorization': `Bearer ${process.env.API_TOKEN}`
            }
        });
    }

    static async placeOrder(orderData) {
        try {
            if (!API_URL || !API_TOKEN) {
                throw new Error('API configuration missing');
            }

            Logger.info('Placing order:', {
                link: orderData.link,
                server: orderData.server,
                count: orderData.count
            });

            const formData = new URLSearchParams();
            formData.append('token', API_TOKEN);
            formData.append('link', orderData.link);
            formData.append('server', orderData.server);
            formData.append('count', orderData.count);
            formData.append('note', orderData.note || 'TikUp Bot');

            const response = await axios.post(API_URL + 'tiktok/follow_tiktok', formData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            Logger.info('API response:', {
                status: response.data.status,
                msg: response.data.msg,
                order_id: response.data.order_id
            });

            // Kiểm tra response format
            if (response.data.status !== 1) {
                throw new Error(response.data.msg || 'API Error');
            }

            // Trả về order_id từ response
            return response.data.order_id;

        } catch (error) {
            if (axios.isAxiosError(error)) {
                Logger.error('API Network Error:', {
                    message: error.message,
                    response: error.response?.data
                });
                throw new Error('Lỗi kết nối: ' + error.message);
            }
            
            Logger.error('API Error:', {
                error: error.message,
                response: error.response?.data
            });
            throw new Error(error.message || 'Lỗi không xác định');
        }
    }

    async checkOrderStatus(orderId) {
        try {
            Logger.info('Checking order status:', { order_id: orderId });

            const response = await this.api.post('/v2', {
                key: process.env.API_TOKEN,
                action: 'status',
                order: orderId
            });

            // Check if response exists and has data
            if (!response?.data) {
                throw new Error('Invalid API response');
            }

            const orderData = response.data[orderId];
            if (!orderData) {
                throw new Error('Order not found in response');
            }

            Logger.info('Status check response:', {
                order_id: orderId,
                response: orderData
            });

            return {
                charge: orderData.charge,
                status: orderData.status,
                start_count: orderData.start_count || 0,
                remains: orderData.remains || 0,
                currency: orderData.currency || 'USD'
            };

        } catch (error) {
            Logger.error('Status check error:', {
                error: error.message,
                order_id: orderId,
                stack: error.stack,
                response: error.response?.data
            });

            // Return error object instead of throwing
            return {
                status: 'error',
                msg: 'Không thể kiểm tra trạng thái đơn hàng'
            };
        }
    }
}

module.exports = new HacklikeApi(); 