const pool = require('./database');
const axios = require('axios');
const { Markup } = require('telegraf');

// Server configurations
const SERVERS = {
    '1': { name: 'Máy chủ 1 - Nhanh', cost: 250, id: 'server_1' },
    '2': { name: 'Máy chủ 2 - Chậm', cost: 150, id: 'server_6' }
};

// State management for user sessions
const userStates = new Map();

function initUserState(userId) {
    return {
        step: 'SERVER_SELECTION',
        serverId: null,
        link: null,
        quantity: null,
        totalCost: null,
        startTime: Date.now()
    };
}

function isValidTikTokLink(link) {
    try {
        const url = new URL(link);
        return url.hostname.includes('tiktok.com') ||
            url.hostname.includes('vm.tiktok.com') ||
            url.hostname.includes('vt.tiktok.com');
    } catch {
        return false;
    }
}

async function checkUserBalance(userId) {
    try {
        const result = await pool.query('SELECT balance FROM users WHERE user_id = $1', [userId]);
        return result.rows[0]?.balance || 0;
    } catch (error) {
        console.error('Error checking balance:', error);
        throw error;
    }
}

async function deductBalance(userId, amount) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(
            'UPDATE users SET balance = balance - $1 WHERE user_id = $2 AND balance >= $1 RETURNING balance',
            [amount, userId]
        );
        if (result.rows.length === 0) {
            throw new Error('Insufficient balance');
        }
        await client.query('COMMIT');
        return result.rows[0].balance;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function placeOrderViaApi(orderData) {
    const apiUrl = 'https://hacklike17.com/api/tiktok/follow_tiktok';

    console.log('Sending API request:', {
        server: SERVERS[orderData.serverId].id,
        link: orderData.link,
        count: orderData.quantity
    });

    const formData = new URLSearchParams();
    formData.append('token', process.env.API_TOKEN);
    formData.append('link', orderData.link);
    formData.append('server', SERVERS[orderData.serverId].id);
    formData.append('count', orderData.quantity.toString());
    formData.append('note', 'test');

    try {
        const response = await axios.post(apiUrl, formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log('API Response:', response.data);

        if (response.data.status === 1) {
            return {
                orderId: response.data.order_id,
                original: response.data.original
            };
        }
        throw new Error(response.data.msg || 'API Error');
    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
        throw error;
    }
}

async function saveOrder(orderData) {
    const query = `
        INSERT INTO orders (
            user_id, api_order_id, service_type, link,
            quantity, server, total_cost, provider,
            api_endpoint, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
            RETURNING order_id`;

    const values = [
        orderData.userId,
        orderData.apiOrderId,
        'Tăng Follow',
        orderData.link,
        orderData.quantity,
        SERVERS[orderData.serverId].name,
        orderData.totalCost,
        'Hacklike17',
        'https://hacklike17.com/api/tiktok/follow_tiktok',
        'Processing'
    ];

    try {
        const result = await pool.query(query, values);
        return result.rows[0].order_id;
    } catch (error) {
        console.error('Error saving order:', error);
        throw error;
    }
}

module.exports = {
    userStates,
    handleTiktokFollowers: async (ctx) => {
        const userId = ctx.from.id;
        userStates.set(userId, initUserState(userId));

        await ctx.reply('🛠 Chọn máy chủ:', Markup.inlineKeyboard([
            [Markup.button.callback('Máy chủ 1 - Nhanh', 'server_1')],
            [Markup.button.callback('Máy chủ 2 - Chậm', 'server_2')]
        ]));
    },

    handleServerSelection: async (ctx) => {
        try {
            const userId = ctx.from.id;
            const serverId = ctx.match[1];
            const state = userStates.get(userId) || initUserState(userId);

            if (!SERVERS[serverId]) {
                await ctx.reply('❌ Lựa chọn không hợp lệ.');
                return;
            }

            state.serverId = serverId;
            state.step = 'LINK_INPUT';
            userStates.set(userId, state);

            await ctx.answerCbQuery();
            await ctx.reply('🔗 Vui lòng nhập link TikTok:');
        } catch (error) {
            console.error('Server selection error:', error);
            await ctx.reply('❌ Đã xảy ra lỗi. Vui lòng thử lại.');
        }
    },

    handleOrderMessage: async (ctx) => {
        try {
            const userId = ctx.from.id;
            const state = userStates.get(userId);
    
            if (!state) {
                await ctx.reply('❌ Vui lòng bắt đầu lại từ đầu bằng cách chọn "🛒 Order Now"');
                return;
            }
    
            // Check session timeout (5 minutes)
            if (Date.now() - state.startTime > 5 * 60 * 1000) {
                userStates.delete(userId);
                await ctx.reply('❌ Phiên làm việc đã hết hạn. Vui lòng bắt đầu lại.');
                return;
            }
    
            switch (state.step) {
                case 'LINK_INPUT':
                    if (!isValidTikTokLink(ctx.message.text)) {
                        await ctx.reply('❌ Link không hợp lệ. Vui lòng nhập lại link TikTok.');
                        return;
                    }
                    state.link = ctx.message.text;
                    state.step = 'QUANTITY_INPUT';
                    await ctx.reply('🔢 Nhập số lượng follow muốn tăng:');
                    break;
    
                case 'QUANTITY_INPUT':
                    const quantity = parseInt(ctx.message.text);
                    if (isNaN(quantity) || quantity < 100 || quantity > 10000) {
                        await ctx.reply('❌ Số lượng không hợp lệ. Vui lòng nhập số từ 100 đến 10,000.');
                        return;
                    }
    
                    state.quantity = quantity;
                    state.totalCost = quantity * SERVERS[state.serverId].cost;
                    state.step = 'CONFIRMATION';
    
                    const userBalance = await checkUserBalance(userId);
                    if (userBalance < state.totalCost) {
                        await ctx.reply(
                            `❌ Số dư không đủ!\n\n` +
                            `💰 Số dư hiện tại: ${userBalance.toLocaleString()}đ\n` +
                            `💰 Số tiền cần: ${state.totalCost.toLocaleString()}đ\n` +
                            `💰 Cần nạp thêm: ${(state.totalCost - userBalance).toLocaleString()}đ`
                        );
                        userStates.delete(userId);
                        return;
                    }
    
                    const orderKey = `order_${userId}_${Date.now()}`;
                    const orderData = {
                        userId,
                        serverId: state.serverId,
                        link: state.link,
                        quantity: state.quantity,
                        totalCost: state.totalCost
                    };
    
                    // Lưu orderData vào temporary storage
                    userStates.set(orderKey, orderData);
    
                    await ctx.reply(
                        `📋 CHI TIẾT ĐƠN HÀNG\n\n` +
                        `🔗 Link TikTok:\n${state.link}\n\n` +
                        `📊 THÔNG TIN:\n` +
                        `├ Số lượng: ${state.quantity.toLocaleString()} follow\n` +
                        `├ Máy chủ: ${SERVERS[state.serverId].name}\n` +
                        `├ Đơn giá: ${SERVERS[state.serverId].cost.toLocaleString()}đ\n` +
                        `└ Tổng tiền: ${state.totalCost.toLocaleString()}đ\n\n` +
                        `💰 Số dư hiện tại: ${userBalance.toLocaleString()}đ\n` +
                        `💰 Số dư còn lại: ${(userBalance - state.totalCost).toLocaleString()}đ\n\n` +
                        `⚠️ LƯU Ý:\n` +
                        `• Vui lòng kiểm tra kỹ link trước khi xác nhận\n` +
                        `• Đơn đã tạo không thể hủy hoặc hoàn tiền\n` +
                        `• Thời gian hoàn thành từ 1-24h tùy số lượng`,
                        Markup.inlineKeyboard([
                            [
                                Markup.button.callback('✅ Xác nhận', `confirm_${orderKey}`),
                                Markup.button.callback('❌ Huỷ', `cancel_${orderKey}`)
                            ]
                        ])
                    );
                    break;
            }
        } catch (error) {
            console.error('Message handling error:', error);
            await ctx.reply('❌ Đã xảy ra lỗi. Vui lòng thử lại.');
            userStates.delete(ctx.from.id);
        }
    },

    handleOrderButtons: async (ctx) => {
        try {
            const action = ctx.match[0];
            const orderKey = action.replace(/^(confirm|cancel)_/, '');
            const orderData = userStates.get(orderKey);

            if (!orderData) {
                await ctx.answerCbQuery('Đơn hàng đã hết hạn hoặc không tồn tại');
                await ctx.editMessageText('❌ Đơn hàng đã hết hạn hoặc không tồn tại.');
                return;
            }

            if (action.startsWith('confirm_')) {
                await ctx.answerCbQuery('Đang xử lý đơn hàng...');

                // 1. Trừ tiền
                await deductBalance(orderData.userId, orderData.totalCost);

                // 2. Đặt đơn qua API
                const apiResponse = await placeOrderViaApi(orderData);

                // 3. Lưu đơn hàng
                const orderId = await saveOrder({
                    ...orderData,
                    apiOrderId: apiResponse.orderId
                });

                // 4. Cập nhật message thành công
                await ctx.editMessageText(
                    `✅ ĐẶT ĐƠN THÀNH CÔNG!\n\n` +
                    `📋 THÔNG TIN ĐƠN HÀNG:\n` +
                    `🆔 Mã đơn: #${apiResponse.orderId}\n` +
                    `🔗 Link: ${orderData.link}\n` +
                    `👥 Số lượng: ${orderData.quantity.toLocaleString()} follow\n` +
                    `💰 Tổng tiền: ${orderData.totalCost.toLocaleString()}đ\n` +
                    `⏳ Trạng thái: Đang xử lý\n\n` +
                    `ℹ️ Đơn hàng sẽ được xử lý trong vòng 24h.\n` +
                    `📞 Liên hệ admin nếu cần hỗ trợ thêm.`
                );

                // Xoá trạng thái phiên sau khi xác nhận thành công
                userStates.delete(orderKey);
                userStates.delete(orderData.userId);

            } else if (action.startsWith('cancel_')) {
                await ctx.answerCbQuery('Đã huỷ đơn hàng');
                await ctx.editMessageText('❌ Đơn hàng đã được huỷ.');

                // Xoá trạng thái phiên khi hủy đơn
                userStates.delete(orderKey);
                userStates.delete(orderData.userId);
            }
        } catch (error) {
            console.error('Button handling error:', error);
            await ctx.answerCbQuery('Có lỗi xảy ra');
            await ctx.reply('❌ Có lỗi xảy ra khi xử lý đơn hàng. Vui lòng thử lại sau.');
        }
    }
};