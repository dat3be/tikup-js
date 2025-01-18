class MessageFormatter {
    static formatMoney(amount) {
        return amount.toLocaleString('vi-VN') + 'đ';
    }

    static formatOrderDetails(order, statusData) {
        return `📦 <b>CHI TIẾT ĐƠN HÀNG</b>\n\n` +
            `🆔 Mã đơn: #${order.api_order_id}\n` +
            `👤 Username: @${order.username}\n` +
            `📝 Dịch vụ: ${order.service_type}\n` +
            `🔗 Link: ${order.link}\n` +
            `👥 Số lượng: ${this.formatMoney(order.quantity)}\n` +
            `📊 Đã chạy: ${this.formatMoney(statusData.startCount)}\n` +
            `📈 Còn lại: ${this.formatMoney(statusData.remains)}\n` +
            `🖥 Máy chủ: ${order.server}\n` +
            `💰 Tổng tiền: ${this.formatMoney(order.total_cost)}\n` +
            `⏰ Thời gian: ${new Date(order.created_at).toLocaleString('vi-VN')}\n` +
            `⌛️ Trạng thái: ${statusData.status}\n\n` +
            `ℹ️ Đơn hàng sẽ được xử lý trong vòng 24h.`;
    }

    static formatUserInfo(user) {
        return `👤 <b>THÔNG TIN TÀI KHOẢN</b>\n\n` +
            `🆔 ID: <code>${user.user_id}</code>\n` +
            `👤 Username: @${user.username}\n` +
            `💰 Số dư: ${this.formatMoney(user.balance)}\n` +
            `🔗 Link giới thiệu: ${user.aff_link}\n` +
            `📋 Mã giới thiệu: ${user.aff_code}`;
    }

    static formatDepositInfo(bankInfo, userId) {
        return `💳 <b>THÔNG TIN CHUYỂN KHOẢN</b>\n\n` +
            `🏦 Ngân hàng: ${bankInfo.name}\n` +
            `👤 Chủ tài khoản: ${bankInfo.account_name}\n` +
            `💳 Số tài khoản: <code>${bankInfo.account}</code>\n` +
            `💰 Nội dung: <code>NAP ${userId}</code>\n\n` +
            `ℹ️ Vui lòng chuyển khoản đúng nội dung để được cộng tiền tự động.`;
    }
}

module.exports = MessageFormatter; 