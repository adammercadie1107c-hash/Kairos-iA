-- Make email and phone nullable (null = not provided, cleaner than empty string)
ALTER TABLE prospects ALTER COLUMN email DROP NOT NULL;
ALTER TABLE prospects ALTER COLUMN email SET DEFAULT NULL;
ALTER TABLE prospects ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE prospects ALTER COLUMN phone SET DEFAULT NULL;

-- Convert existing empty strings to null
UPDATE prospects SET email = NULL WHERE email = '';
UPDATE prospects SET phone = NULL WHERE phone = '';
