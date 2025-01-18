const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3333; // Cổng server

// Middleware để parse JSON từ request body
app.use(bodyParser.json());

// Endpoint Webhook nhận dữ liệu từ Casso
app.post('/webhook/casso', (req, res) => {
  try {
    const { error, data } = req.body;

    // Kiểm tra nếu không có dữ liệu hoặc lỗi
    if (error !== 0 || !data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'Invalid data format or error in payload' });
    }

    // Duyệt qua từng giao dịch trong dữ liệu
    data.forEach(transaction => {
      console.log('Processing transaction:', transaction);

      // Xử lý logic: lưu vào database, xác minh, gửi thông báo, v.v.
      // Ví dụ: chỉ log thông tin
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

// Khởi động server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
