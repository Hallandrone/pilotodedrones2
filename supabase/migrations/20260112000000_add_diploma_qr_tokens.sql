-- Drop existing table and recreate from scratch
DROP TABLE IF EXISTS diploma_qr_tokens CASCADE;

-- Create diploma_qr_tokens table
CREATE TABLE diploma_qr_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token VARCHAR(32) UNIQUE NOT NULL,
  diploma_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  associated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_diploma_qr_token ON diploma_qr_tokens(token);
CREATE INDEX idx_diploma_qr_user ON diploma_qr_tokens(user_id);
CREATE INDEX idx_diploma_qr_diploma ON diploma_qr_tokens(diploma_id);

-- Add RLS policies
ALTER TABLE diploma_qr_tokens ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own QR tokens
CREATE POLICY "Users can read their own QR tokens"
  ON diploma_qr_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow authenticated users to update unassociated tokens (for association)
CREATE POLICY "Users can associate unassociated QR tokens"
  ON diploma_qr_tokens
  FOR UPDATE
  USING (user_id IS NULL OR auth.uid() = user_id);

-- Allow system to insert QR tokens (when generating diplomas)
CREATE POLICY "Allow insert for authenticated users"
  ON diploma_qr_tokens
  FOR INSERT
  WITH CHECK (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_diploma_qr_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER diploma_qr_tokens_updated_at
  BEFORE UPDATE ON diploma_qr_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_diploma_qr_tokens_updated_at();
