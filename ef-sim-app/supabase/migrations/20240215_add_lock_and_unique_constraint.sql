-- 0. Create user_roles table if it doesn't exist (Required for the policy below)
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'developer', 'user')),
    PRIMARY KEY (user_id, role)
);

-- Enable RLS for user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own roles
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- 1. 重複登録防止の制約を追加 (同名・同種のカードの二重登録を防ぐ)
ALTER TABLE public.players
ADD CONSTRAINT unique_name_card_type UNIQUE (name, card_type);

-- 2. ロック機能用のカラムを追加 (デフォルトは false = 誰でも編集可能)
ALTER TABLE public.players
ADD COLUMN is_locked BOOLEAN NOT NULL DEFAULT false;

-- 3. players テーブルの RLS ポリシーの更新
-- (Antigravityが以前作成した可能性のある個人ロック設定を削除し、Wiki形式に上書きします)
DROP POLICY IF EXISTS "Users can update their own records" ON public.players;
DROP POLICY IF EXISTS "Users can update their own players" ON public.players;

-- 一般ユーザー（ログイン済み）は、ロックされていない選手のみ更新可能
-- 開発者/管理者は、ロックされていても更新可能
CREATE POLICY "Users can update unlocked players, Admins can update all"
ON public.players
FOR UPDATE
TO authenticated
USING (
    is_locked = false 
    OR 
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('admin', 'developer')
    )
);

-- 選手の削除は、管理者/開発者のみ可能とする安全設計
DROP POLICY IF EXISTS "Users can delete their own records" ON public.players;
DROP POLICY IF EXISTS "Users can delete their own players" ON public.players;

CREATE POLICY "Only admins and developers can delete players"
ON public.players
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('admin', 'developer')
    )
);
