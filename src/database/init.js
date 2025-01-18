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
                referred_by VARCHAR(10),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create affiliates table
        await db.query(`
            CREATE TABLE IF NOT EXISTS affiliates (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) UNIQUE NOT NULL,
                aff_code VARCHAR(10) UNIQUE NOT NULL,
                aff_link VARCHAR(255) NOT NULL,
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
                amount DECIMAL(15,2) NOT NULL,
                commission_amount DECIMAL(15,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES affiliates(user_id),
                FOREIGN KEY (referral_id) REFERENCES users(user_id)
            )
        `);

        // Create indexes
        await db.query(`
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
        `);

        // Create orders table
        await db.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                api_order_id VARCHAR(100),
                service_id VARCHAR(100) NOT NULL,
                link VARCHAR(255) NOT NULL,
                quantity INTEGER NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            );

            CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
            CREATE INDEX IF NOT EXISTS idx_orders_api_order_id ON orders(api_order_id);
        `);

        Logger.info('Database initialized successfully');
    } catch (error) {
        Logger.error('Database initialization error:', error);
        throw error;
    }
};

module.exports = initDatabase; 