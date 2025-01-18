const Logger = require('../utils/logger');

class ErrorHandler {
    static async handleError(ctx, next) {
        try {
            await next();
        } catch (error) {
            Logger.error('Unhandled error', error);

            // Send user-friendly error message
            const message = this.getErrorMessage(error);
            await ctx.reply(message);
        }
    }

    static getErrorMessage(error) {
        // Map known errors to user-friendly messages
        switch (error.message) {
            case 'Insufficient balance':
                return '❌ Số dư không đủ để thực hiện giao dịch.';
            case 'Invalid server selection':
                return '❌ Máy chủ không hợp lệ.';
            case 'Order not found':
                return '❌ Không tìm thấy đơn hàng.';
            case 'Invalid link':
                return '❌ Link không hợp lệ.';
            default:
                return '❌ Đã xảy ra lỗi. Vui lòng thử lại sau.';
        }
    }
}

module.exports = ErrorHandler; 