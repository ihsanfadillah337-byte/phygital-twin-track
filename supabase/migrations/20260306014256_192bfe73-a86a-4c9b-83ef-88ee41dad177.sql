
-- Tighten INSERT policy on documents
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON public.documents;
CREATE POLICY "Users can insert documents as their agency"
ON public.documents FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR sender = public.get_user_agency(auth.uid())
);

-- Tighten INSERT policy on scan_logs  
DROP POLICY IF EXISTS "Authenticated can insert scan logs" ON public.scan_logs;
CREATE POLICY "Users can insert own scan logs"
ON public.scan_logs FOR INSERT
TO authenticated
WITH CHECK (
  scanned_by = auth.uid()
);
