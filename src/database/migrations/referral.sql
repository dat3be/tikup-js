-- Create ranks table
CREATE TABLE IF NOT EXISTS ranks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    required_referrals INTEGER NOT NULL
);

-- Insert rank data
INSERT INTO ranks (name, commission_rate, required_referrals) VALUES
    ('Bronze', 0, 0),
    ('Silver', 2, 5),
    ('Gold', 3, 20),
    ('Platinum', 5, 50),
    ('Diamond', 7, 100),
    ('Ambassador', 10, 1000);

-- Add rank to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS rank VARCHAR(50) DEFAULT 'Bronze';
ALTER TABLE users ADD CONSTRAINT fk_user_rank FOREIGN KEY (rank) REFERENCES ranks(name);

-- Add commission tracking
CREATE TABLE IF NOT EXISTS commissions (
    id SERIAL PRIMARY KEY,
    upline_id VARCHAR(255) NOT NULL,
    downline_id VARCHAR(255) NOT NULL,
    transaction_id INTEGER NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    commission_amount DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (upline_id) REFERENCES users(user_id),
    FOREIGN KEY (downline_id) REFERENCES users(user_id),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id)
); 