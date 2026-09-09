import { NextResponse, type NextRequest } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password } = body;

    const cleanUsername = typeof username === "string" ? username.trim() : "";
    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    // 1. Validation
    if (!cleanUsername) {
      return NextResponse.json({ error: "Username is required." }, { status: 400 });
    }
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return NextResponse.json({ error: "Username must be between 3 and 30 characters." }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      return NextResponse.json(
        { error: "Username can only contain letters, numbers, underscores, and hyphens." },
        { status: 400 }
      );
    }
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    // 2. Supabase Configuration
    const config = getSupabaseConfig();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!config || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Authentication service is misconfigured on the server." },
        { status: 500 }
      );
    }

    const admin = createAdminClient(config.url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3. Create user with email_confirm: true (No confirmation emails dispatched, bypassing rate limits)
    const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        username: cleanUsername,
      },
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    // 4. Associate profile in public.profiles table if present
    if (createdUser?.user) {
      try {
        await admin.from("profiles").upsert({
          id: createdUser.user.id,
          username: cleanUsername,
          updated_at: new Date().toISOString(),
        });
      } catch {
        // Table will also be populated by SQL trigger if executed in Supabase SQL editor
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: createdUser.user.id,
        email: createdUser.user.email,
        username: cleanUsername,
      },
    });
  } catch (error) {
    console.error("Account creation error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during account creation. Please try again." },
      { status: 500 }
    );
  }
}
