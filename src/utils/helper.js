function formatNumber(number) {
    return new Intl.NumberFormat('vi-VN').format(number);
}

module.exports = {
    formatNumber
}; 