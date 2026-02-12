-- 1. Create user_saved_builds table
CREATE TABLE IF NOT EXISTS public.user_saved_builds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    build_name TEXT NOT NULL,
    allocation JSONB, -- Stores the allocation object e.g. { "shooting": 4, ... }
    manager_proficiency INTEGER,
    active_unique_value INTEGER,
    selected_additional_booster_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for user_saved_builds
ALTER TABLE public.user_saved_builds ENABLE ROW LEVEL SECURITY;

-- Policies for user_saved_builds
CREATE POLICY "Users can select their own builds"
    ON public.user_saved_builds FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own builds"
    ON public.user_saved_builds FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own builds"
    ON public.user_saved_builds FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own builds"
    ON public.user_saved_builds FOR DELETE
    USING (auth.uid() = user_id);


-- 2. Create user_skill_presets table
CREATE TABLE IF NOT EXISTS public.user_skill_presets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preset_name TEXT NOT NULL,
    skills JSONB NOT NULL, -- Stores array of strings e.g. ["Acrobatic Finishing", "Heel Trick"]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for user_skill_presets
ALTER TABLE public.user_skill_presets ENABLE ROW LEVEL SECURITY;

-- Policies for user_skill_presets
CREATE POLICY "Users can select their own presets"
    ON public.user_skill_presets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own presets"
    ON public.user_skill_presets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presets"
    ON public.user_skill_presets FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presets"
    ON public.user_skill_presets FOR DELETE
    USING (auth.uid() = user_id);
