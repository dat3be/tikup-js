-- Remove columns from users
ALTER TABLE users DROP COLUMN IF EXISTS aff_code;
ALTER TABLE users DROP COLUMN IF EXISTS aff_link;

-- Drop and recreate affiliates table
DROP TABLE IF EXISTS affiliates;
CREATE TABLE affiliates (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    aff_code VARCHAR(6) UNIQUE NOT NULL,
    aff_link VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
); 