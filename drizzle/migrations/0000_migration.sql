CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  plan text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (display_name) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  original_path text NOT NULL,
  result_path text,
  size_bytes integer NOT NULL DEFAULT 0,
  downloads integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);
CREATE INDEX uploads_user_created ON public.uploads(user_id, created_at DESC);
GRANT SELECT, DELETE ON public.uploads TO authenticated;
GRANT UPDATE (downloads) ON public.uploads TO authenticated;
GRANT ALL ON public.uploads TO service_role;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own uploads select" ON public.uploads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own uploads update" ON public.uploads FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own uploads delete" ON public.uploads FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Own images read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Own images insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Own images delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);