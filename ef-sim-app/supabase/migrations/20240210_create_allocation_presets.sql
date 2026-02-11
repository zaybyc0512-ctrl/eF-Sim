-- Create table for storing allocation presets
create table if not exists allocation_presets (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  goals jsonb not null, -- e.g. [{"stat": "speed", "target": 90}, {"stat": "dribbling", "target": 85}]
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table allocation_presets enable row level security;

-- Create policy to allow all operations for anon (for demo purposes)
create policy "Enable all for anon" on allocation_presets
  for all using (true) with check (true);
