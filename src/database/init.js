const db = require('../config/database');
const Logger = require('../utils/logger');

const initDatabase = async () => {
    try {
        // Create users table
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(255),
                balance DECIMAL(15,2) DEFAULT 0,
                rank VARCHAR(50) DEFAULT 'Bronze',
                referred_by VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create transactions table
        await db.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NULL,
                tid VARCHAR(100),
                type VARCHAR(50) NULL,
                amount DECIMAL(15,2) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                payment_method VARCHAR(50),
                bank_name VARCHAR(100),
                bank_account VARCHAR(50),
                message_id VARCHAR(100),
                description TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
        `);

        // Create orders table
        await db.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL,
                api_order_id VARCHAR(50) NOT NULL UNIQUE,
                service_name VARCHAR(100) NOT NULL,
                link VARCHAR(255) NOT NULL,
                quantity INTEGER NOT NULL,
                price_per_unit INTEGER NOT NULL,
                total_price INTEGER NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                note TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
            CREATE INDEX IF NOT EXISTS idx_orders_api_order_id ON orders(api_order_id);
            CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
            CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
        `);
        
        // Create affiliates table
        await db.query(`
            CREATE TABLE IF NOT EXISTS affiliates (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) UNIQUE NOT NULL,
                aff_code VARCHAR(10) UNIQUE NOT NULL,
                aff_link VARCHAR(255) NOT NULL,
                rank VARCHAR(20) DEFAULT 'Bronze',
                commission DECIMAL(15,2) DEFAULT 0,
                total_commission DECIMAL(15,2) DEFAULT 0,
                total_referrals INTEGER DEFAULT 0,
                commission_rate DECIMAL(5,2) DEFAULT 5,
                status VARCHAR(20) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
        `);

        // Create commissions table
        await db.query(`
            CREATE TABLE IF NOT EXISTS commissions (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                referral_id VARCHAR(255) NOT NULL,
                transaction_id VARCHAR(50) NOT NULL,
                amount DECIMAL(15,2) NULL,
                commission_amount DECIMAL(15,2) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES affiliates(user_id),
                FOREIGN KEY (referral_id) REFERENCES users(user_id)
            )
        `);

        // Create indexes
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
            CREATE INDEX IF NOT EXISTS idx_transactions_tid ON transactions(tid);
            CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
            CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
            CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
            CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
            CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON affiliates(user_id);
            CREATE INDEX IF NOT EXISTS idx_affiliates_aff_code ON affiliates(aff_code);
            CREATE INDEX IF NOT EXISTS idx_commissions_user_id ON commissions(user_id);
            CREATE INDEX IF NOT EXISTS idx_commissions_transaction_id ON commissions(transaction_id);
        `);

        // Create trigger for updated_at
        await db.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';

            DROP TRIGGER IF EXISTS update_users_updated_at ON users;
            CREATE TRIGGER update_users_updated_at
                BEFORE UPDATE ON users
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();

            DROP TRIGGER IF EXISTS update_affiliates_updated_at ON affiliates;
            CREATE TRIGGER update_affiliates_updated_at
                BEFORE UPDATE ON affiliates
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();

            DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
            CREATE TRIGGER update_transactions_updated_at
                BEFORE UPDATE ON transactions
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();

            DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
            CREATE TRIGGER update_orders_updated_at
                BEFORE UPDATE ON orders
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);

        Logger.info('Database initialized successfully');
    } catch (error) {
        Logger.error('Database initialization error:', error);
        throw error;
    }
};
module.exports = initDatabase;
