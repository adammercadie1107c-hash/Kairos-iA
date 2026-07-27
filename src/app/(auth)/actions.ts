"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      email,
      full_name: fullName,
    });

    if (profileError && !profileError.message.includes("duplicate")) {
      return { error: "Erreur lors de la création du profil." };
    }

    const { error: configError } = await supabase
      .from("agent_configs")
      .insert({ user_id: data.user.id });

    if (configError && !configError.message.includes("duplicate")) {
      return { error: "Erreur lors de la création de la configuration." };
    }

    const { error: channelError } = await supabase.from("channels").insert({
      user_id: data.user.id,
      type: "demo",
      status: "active",
    });

    if (channelError && !channelError.message.includes("duplicate")) {
      return { error: "Erreur lors de la création du canal démo." };
    }
  }

  redirect("/dashboard");
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
