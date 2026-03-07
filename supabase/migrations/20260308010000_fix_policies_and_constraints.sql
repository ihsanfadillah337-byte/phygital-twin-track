-- Fix 1: Add INSERT policy on profiles so new users can create their profile row
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Fix 2: Add INSERT policy on user_roles so new users can self-assign their role
CREATE POLICY "Users can insert own role"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Fix 3: Drop the old restrictive CHECK constraint on documents.status
-- and replace with one that includes 'Wrong Delivery'
ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_status_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_status_check
  CHECK (status IN ('Pending', 'In Transit', 'Received', 'Mismatch Warning', 'Wrong Delivery'));
