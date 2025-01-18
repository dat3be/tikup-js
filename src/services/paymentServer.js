const express = require('express');
const bodyParser = require('body-parser');

class PaymentServer {
    constructor() {
        this.app = express();
        this.port = 3333; // Cổng server
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        // Middleware parse JSON từ request body
        this.app.use(bodyParser.json());
    }

    setupRoutes() {
        // Endpoint Webhook nhận dữ liệu từ Casso
        this.app.post('/webhook/casso', (req, res) => {
            try {
                const { error, data } = req.body;

                // Kiểm tra nếu không có dữ liệu hoặc lỗi
                if (error !== 0 || !data || !Array.isArray(data) || data.length === 0) {
                    return res.status(400).json({ error: 'Invalid data format or error in payload' });
                }

                // Xử lý từng giao dịch
                data.forEach(transaction => {
                    console.log('Processing transaction:', transaction);

                    // Xử lý logic (ví dụ: log thông tin giao dịch)
                    console.log(`
                        Transaction ID: ${transaction.tid}
                        Description: ${transaction.description}
                        Amount: ${transaction.amount}
                        Bank Name: ${transaction.bankName}
                        Correspondent Name: ${transaction.corresponsiveName}
                    `);
                });

                // Trả về response thành công
                res.status(200).json({
                    status: 'success',
                    message: 'Payment data processed successfully',
                });
            } catch (error) {
                console.error('Error processing webhook:', error);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });

        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok' });
        });
    }

    start() {
        // Khởi động server
        this.app.listen(this.port, () => {
            console.log(`Server is running on http://localhost:${this.port}`);
        });
    }
}

module.exports = new PaymentServer();
