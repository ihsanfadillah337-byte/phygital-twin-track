
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'skpd_user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer function to get user agency
CREATE OR REPLACE FUNCTION public.get_user_agency(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT raw_user_meta_data->>'agency_name'
  FROM auth.users
  WHERE id = _user_id
$$;

-- RLS on user_roles: users can read their own roles
CREATE POLICY "Users can read own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Drop existing permissive policies on documents
DROP POLICY IF EXISTS "Allow public insert" ON public.documents;
DROP POLICY IF EXISTS "Allow public read" ON public.documents;
DROP POLICY IF EXISTS "Allow public update" ON public.documents;

-- New RLS policies on documents

-- SELECT: super_admin sees all, skpd_user sees docs where they are sender or destination
CREATE POLICY "Users can read relevant documents"
ON public.documents FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.get_user_agency(auth.uid()) = sender
  OR public.get_user_agency(auth.uid()) = destination_skpd
);

-- INSERT: authenticated users can insert (sender will be set by app)
CREATE POLICY "Authenticated users can insert documents"
ON public.documents FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: super_admin can update all, skpd_user can update if they are sender or destination
CREATE POLICY "Users can update relevant documents"
ON public.documents FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.get_user_agency(auth.uid()) = sender
  OR public.get_user_agency(auth.uid()) = destination_skpd
);

-- Add "Wrong Delivery" as a valid status concept (no constraint needed, it's text)

-- Create a scan_logs table for tracking mismatch events
CREATE TABLE public.scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  scanned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scanner_agency TEXT NOT NULL,
  expected_agency TEXT NOT NULL,
  result TEXT NOT NULL, -- 'match' or 'mismatch'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can insert scan logs"
ON public.scan_logs FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can read scan logs"
ON public.scan_logs FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR scanner_agency = public.get_user_agency(auth.uid())
  OR expected_agency = public.get_user_agency(auth.uid())
);

-- Enable realtime for scan_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.scan_logs;
