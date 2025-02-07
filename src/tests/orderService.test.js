const OrderService = require('../services/orderService');
const Order = require('../models/order');
const HacklikeApi = require('../services/api/hacklikeApi');
const pool = require('../config/database');

// Mock các module phụ thuộc
jest.mock('../models/order');
jest.mock('../services/api/hacklikeApi');

describe('OrderService - checkAndUpdateOrders', () => {
    beforeEach(() => {
        // Reset tất cả mock trước mỗi test
        jest.clearAllMocks();
    });

    // Thêm afterAll để đóng kết nối database
    afterAll(async () => {
        await pool.end();
    });

    test('nên cập nhật trạng thái cho tất cả các đơn hàng đang hoạt động', async () => {
        // Mock dữ liệu test
        const mockActiveOrders = [
            { api_order_id: 'order1' },
            { api_order_id: 'order2' },
            { api_order_id: 'order3' }
        ];

        // Mock các phương thức
        Order.getActiveOrders.mockResolvedValue(mockActiveOrders);
        HacklikeApi.checkOrderStatus.mockImplementation(async (orderId) => {
            const statusMap = {
                'order1': 'completed',
                'order2': 'processing',
                'order3': 'pending'
            };
            return statusMap[orderId];
        });

        // Thực thi hàm cần test
        await OrderService.checkAndUpdateOrders();

        // Kiểm tra kết quả
        expect(Order.getActiveOrders).toHaveBeenCalledTimes(1);
        expect(HacklikeApi.checkOrderStatus).toHaveBeenCalledTimes(3);
        expect(Order.updateStatus).toHaveBeenCalledTimes(3);
    });

    test('nên xử lý lỗi khi cập nhật một đơn hàng thất bại', async () => {
        // Mock dữ liệu test
        const mockActiveOrders = [
            { api_order_id: 'order1' },
            { api_order_id: 'error_order' },
            { api_order_id: 'order3' }
        ];

        // Mock các phương thức
        Order.getActiveOrders.mockResolvedValue(mockActiveOrders);
        HacklikeApi.checkOrderStatus.mockImplementation(async (orderId) => {
            if (orderId === 'error_order') {
                throw new Error('API Error');
            }
            return 'completed';
        });

        // Thực thi hàm cần test
        await OrderService.checkAndUpdateOrders();

        // Kiểm tra kết quả
        expect(Order.getActiveOrders).toHaveBeenCalledTimes(1);
        expect(HacklikeApi.checkOrderStatus).toHaveBeenCalledTimes(3);
        expect(Order.updateStatus).toHaveBeenCalledTimes(2);
    });

    test('nên ném lỗi khi không thể lấy danh sách đơn hàng đang hoạt động', async () => {
        // Mock lỗi khi lấy active orders
        Order.getActiveOrders.mockRejectedValue(new Error('Database error'));

        // Thực thi và kiểm tra lỗi
        await expect(OrderService.checkAndUpdateOrders()).rejects.toThrow('Database error');
        
        expect(Order.getActiveOrders).toHaveBeenCalledTimes(1);
        expect(HacklikeApi.checkOrderStatus).not.toHaveBeenCalled();
        expect(Order.updateStatus).not.toHaveBeenCalled();
    });
}); 