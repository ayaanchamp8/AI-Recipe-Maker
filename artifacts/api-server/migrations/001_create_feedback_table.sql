-- Create recipe_feedback table if it doesn't exist
CREATE TABLE IF NOT EXISTS recipe_feedback (
  id SERIAL PRIMARY KEY,
  recipe_name VARCHAR(500) NOT NULL,
  user_name VARCHAR(200) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indices for faster queries
CREATE INDEX IF NOT EXISTS idx_recipe_feedback_recipe_name ON recipe_feedback(recipe_name);
CREATE INDEX IF NOT EXISTS idx_recipe_feedback_created_at ON recipe_feedback(created_at);

-- Add new columns to search_events if they don't exist (PostgreSQL way)
ALTER TABLE search_events ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50);
ALTER TABLE search_events ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE search_events ADD COLUMN IF NOT EXISTS visitor_id VARCHAR(100);

-- Create indices for the new columns
CREATE INDEX IF NOT EXISTS idx_search_events_ip_address ON search_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_search_events_country ON search_events(country);
CREATE INDEX IF NOT EXISTS idx_search_events_visitor_id ON search_events(visitor_id);
