ALTER TABLE public.documents
  ADD COLUMN pic_sender TEXT,
  ADD COLUMN courier_name TEXT,
  ADD COLUMN physical_description TEXT,
  ADD COLUMN urgency TEXT NOT NULL DEFAULT 'Biasa';