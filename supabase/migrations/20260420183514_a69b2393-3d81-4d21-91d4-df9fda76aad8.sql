-- Bucket público para avatares dos jogadores
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Leitura pública dos avatares
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Cada usuário só pode escrever na própria pasta {userId}/...
CREATE POLICY "Users upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins gerenciam qualquer avatar (útil para temporary_players e moderação)
CREATE POLICY "Admins manage all avatars"
ON storage.objects FOR ALL
USING (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'));