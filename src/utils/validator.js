class Validator {
    static isValidOrderId(orderId) {
        return /^\d+$/.test(orderId.toString().replace('#', ''));
    }

    static isValidQuantity(quantity, min = 100, max = 10000) {
        const num = parseInt(quantity);
        return !isNaN(num) && num >= min && num <= max;
    }

    static isValidLink(link) {
        try {
            new URL(link);
            return true;
        } catch {
            return false;
        }
    }

    static isValidServer(server, availableServers) {
        return availableServers.hasOwnProperty(server);
    }

    static validateOrderData(orderData, availableServers) {
        const errors = [];

        if (!this.isValidServer(orderData.server, availableServers)) {
            errors.push('Máy chủ không hợp lệ');
        }

        if (!this.isValidQuantity(orderData.quantity)) {
            errors.push('Số lượng không hợp lệ (100-10000)');
        }

        if (!this.isValidLink(orderData.link)) {
            errors.push('Link không hợp lệ');
        }

        return errors;
    }
}

module.exports = Validator; 