-- Drop existing tables if needed
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS users;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255),
    balance DECIMAL(15,2) DEFAULT 0,
    aff_code VARCHAR(255) NULL,
    aff_link VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(255) NULL,
    tid VARCHAR(255) NULL,
    user_id VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    bank_name VARCHAR(255) NULL,
    sender_name VARCHAR(255) NULL,
    sender_account VARCHAR(255) NULL,
    message_id INTEGER NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tid ON transactions(tid); 