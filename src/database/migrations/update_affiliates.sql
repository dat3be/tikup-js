-- Update affiliates table to include bank info
ALTER TABLE affiliates 
ADD COLUMN IF NOT EXISTS account_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(50); 