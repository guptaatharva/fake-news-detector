import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to delete an account." }, { status: 401 });
  }

  const config = getSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!config || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Account deletion is not configured. Add SUPABASE_SERVICE_ROLE_KEY on the server." },
      { status: 503 }
    );
  }

  const admin = createAdminClient(config.url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("Failed to delete Supabase user:", error.message);
    return NextResponse.json({ error: "Unable to delete your account. Please try again." }, { status: 502 });
  }

  // The local user record is created when analyses are saved. deleteMany also
  // succeeds for accounts that have never saved an analysis.
  await prisma.user.deleteMany({ where: { id: user.id } });

  return NextResponse.json({ success: true });
}
