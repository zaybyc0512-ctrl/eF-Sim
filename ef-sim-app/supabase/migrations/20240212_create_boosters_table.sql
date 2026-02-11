-- 1. Create boosters table
create table public.boosters (
    id uuid not null default gen_random_uuid (),
    name text not null,
    type text not null check (type in ('normal', 'special', 'squad_link')),
    targets jsonb not null, -- Array of stat keys like ["dribbling", "speed"] or "all"
    default_value integer not null default 2,
    created_at timestamp with time zone not null default now(),
    constraint boosters_pkey primary key (id)
);

-- 2. Enable RLS
alter table public.boosters enable row level security;

-- 3. Create Policy (Allow read for everyone)
create policy "Enable read access for all users"
on public.boosters
as permissive
for select
to public
using (true);

-- 4. Insert Seed Data
insert into public.boosters (name, type, targets, default_value) values
    -- Squad Link (1)
    ('トータルパッケージ', 'squad_link', '"all"', 0),
    
    -- Special (8)
    ('Natural-born', 'special', '["offensive_awareness", "ball_control", "dribbling", "finishing"]', 4),
    ('Magical', 'special', '["offensive_awareness", "dribbling", "tight_possession", "acceleration"]', 4),
    ('Striking', 'special', '["offensive_awareness", "acceleration", "kicking_power", "physical_contact"]', 4),
    ('KING', 'special', '["dribbling", "tight_possession", "physical_contact", "balance"]', 4),
    ('稀代の天才', 'special', '["offensive_awareness", "ball_control", "dribbling", "physical_contact"]', 3),
    ('リトルプリンス', 'special', '["offensive_awareness", "low_pass", "finishing", "kicking_power"]', 3),
    ('神の子', 'special', '["dribbling", "low_pass", "finishing", "kicking_power"]', 4),
    ('運命の担い手', 'special', '["finishing", "heading", "speed", "acceleration"]', 4),
    
    -- Normal (29)
    ('ボールキャリー', 'normal', '["dribbling", "tight_possession", "speed", "balance"]', 2),
    ('エアリアル', 'normal', '["finishing", "heading", "jump", "physical_contact"]', 2),
    ('シュート', 'normal', '["ball_control", "finishing", "kicking_power", "physical_contact"]', 2),
    ('オフザボール', 'normal', '["offensive_awareness", "speed", "acceleration", "stamina"]', 2),
    ('ストライカーセンス', 'normal', '["offensive_awareness", "ball_control", "finishing", "acceleration"]', 2),
    ('オフェンスクリエイター', 'normal', '["offensive_awareness", "ball_control", "low_pass", "kicking_power"]', 2),
    ('フリーキック', 'normal', '["finishing", "place_kicking", "curl", "kicking_power"]', 2),
    ('ファンタジスタ', 'normal', '["ball_control", "dribbling", "finishing", "balance"]', 2),
    ('ブレークスルー', 'normal', '["dribbling", "speed", "kicking_power", "physical_contact"]', 2),
    ('ストレングス', 'normal', '["speed", "kicking_power", "jump", "physical_contact"]', 2),
    ('アキュラシー', 'normal', '["low_pass", "loft_pass", "finishing", "kicking_power"]', 2),
    ('パス', 'normal', '["low_pass", "loft_pass", "curl", "kicking_power"]', 2),
    ('クロス', 'normal', '["loft_pass", "curl", "speed", "stamina"]', 2),
    ('アジリティ', 'normal', '["speed", "acceleration", "balance", "stamina"]', 2),
    ('テクニック', 'normal', '["ball_control", "dribbling", "tight_possession", "low_pass"]', 2),
    ('バランサー', 'normal', '["offensive_awareness", "defensive_awareness", "acceleration", "stamina"]', 2),
    ('リビルド', 'normal', '["low_pass", "defensive_awareness", "aggression", "defensive_engagement"]', 2),
    ('ボールプロテクション', 'normal', '["ball_control", "tight_possession", "physical_contact", "balance"]', 2),
    ('レジスタ', 'normal', '["tight_possession", "low_pass", "defensive_awareness", "tackling"]', 2),
    ('カウンター', 'normal', '["low_pass", "tackling", "defensive_engagement", "physical_contact"]', 2),
    ('フィジカル', 'normal', '["jump", "physical_contact", "balance", "stamina"]', 2),
    ('ハードワーク', 'normal', '["aggression", "acceleration", "physical_contact", "stamina"]', 2),
    ('スティール', 'normal', '["tackling", "aggression", "acceleration", "physical_contact"]', 2),
    ('エアリアルブロック', 'normal', '["heading", "defensive_awareness", "jump", "physical_contact"]', 2),
    ('デュエル', 'normal', '["defensive_awareness", "tackling", "speed", "stamina"]', 2),
    ('シャットダウン', 'normal', '["defensive_awareness", "tackling", "defensive_engagement", "speed"]', 2),
    ('ディフェンス', 'normal', '["defensive_awareness", "tackling", "acceleration", "jump"]', 2),
    ('ゴールセービング', 'normal', '["gk_awareness", "gk_clearing", "gk_reflexes", "gk_reach"]', 2),
    ('ゴールキーピング', 'normal', '["gk_awareness", "gk_catching", "gk_clearing", "gk_reflexes"]', 2);
