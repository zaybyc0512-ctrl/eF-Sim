-- Create skills table
CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('normal', 'special')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "Allow public read access" ON skills
    FOR SELECT USING (true);

-- Allow write access to admins and developers only
CREATE POLICY "Allow admin/developer write access" ON skills
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role IN ('admin', 'developer')
        )
    );

-- Seed Initial Data using DO block to avoid duplicates if re-run
DO $$
DECLARE
    normal_skills text[] := ARRAY[
        'シザース', 'ダブルタッチ', 'エラシコ', 'ルーレット', 'シャペウ', 'エッジターン', '軸裏ターン', '軸足当て', '足裏コントロール',
        'ヘッダー', 'コントロールカーブ', 'コントロールループ', '無回転シュート', 'ドロップシュート', 'ライジングシュート', 'ミドルシュート',
        'アクロバティックシュート', 'ヒールトリック', 'ワンタッチシュート', 'ワンタッチパス', 'スルーパス', 'バックスピンロブ',
        'ピンポイントクロス', 'アウトスピンキック', 'ラボーナ', 'ノールックパス', '低弾道ロブ', '低弾道パントキック', '高弾道パントキック',
        'ロングスロー', 'GKロングスロー', 'PKキッカー', 'PKストッパー', 'マリーシア', 'マンマーク', 'チェイシング', 'インターセプト',
        'ブロッカー', 'エアバトル', 'スライディングタックル', 'アクロバティッククリア', 'キャプテンシー', 'スーパーサブ', '闘争心'
    ];
    special_skills text[] := ARRAY[
        'モメンタムドリブル', 'アクセルバースト', 'マグネットフィート', 'バレッドヘッド', 'ブリッツカーブ', 'ロースクリーマー',
        'フェノミナルフィニッシュ', 'ウィルパワー', 'エッジクロス', 'ゲームチェンジパス', 'ビジョナリーパス', 'フェノミナルパス',
        'GKディレクティングディフェンス', 'GKスピリットロア', 'ロングリーチタックル', 'フォートレス', 'エアリアルフォート'
    ];
    s text;
BEGIN
    FOREACH s IN ARRAY normal_skills
    LOOP
        INSERT INTO skills (name, type) VALUES (s, 'normal') ON CONFLICT (name) DO NOTHING;
    END LOOP;

    FOREACH s IN ARRAY special_skills
    LOOP
        INSERT INTO skills (name, type) VALUES (s, 'special') ON CONFLICT (name) DO NOTHING;
    END LOOP;
END $$;
