import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const users = [
    { email: "ihsanadmin@gmail.com", password: "ihsan123", agency_name: "BKAD", role: "super_admin" as const },
    { email: "disdik@gmail.com", password: "ihsan123", agency_name: "Dinas Pendidikan", role: "skpd_user" as const },
    { email: "distan@gmail.com", password: "ihsan123", agency_name: "Dinas Pertanian", role: "skpd_user" as const },
    { email: "dinson@gmail.com", password: "ihsan123", agency_name: "Dinas Sosial", role: "skpd_user" as const },
  ];

  const results = [];

  for (const u of users) {
    // Check if user exists
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
    const found = existing?.users?.find((x: any) => x.email === u.email);
    
    let userId: string;
    if (found) {
      userId = found.id;
      // Update metadata
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { agency_name: u.agency_name },
      });
    } else {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { agency_name: u.agency_name },
      });
      if (error) {
        results.push({ email: u.email, error: error.message });
        continue;
      }
      userId = data.user.id;
    }

    // Upsert role
    await supabaseAdmin.from("user_roles").upsert(
      { user_id: userId, role: u.role },
      { onConflict: "user_id,role" }
    );

    // Upsert profile so the Outbox destination dropdown works
    await supabaseAdmin.from("profiles").upsert(
      { id: userId, agency_name: u.agency_name, role: u.role },
      { onConflict: "id" }
    );

    results.push({ email: u.email, role: u.role, agency: u.agency_name, ok: true });
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
