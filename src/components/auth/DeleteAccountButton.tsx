"use client";

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";

export default function DeleteAccountButton() {
  const { deleteAccount } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    const result = await deleteAccount();
    if (result.error) {
      setError(result.error);
      setDeleting(false);
    }
  };

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => setConfirming(true)}
        className="border-neonRed/50 bg-transparent font-mono text-xs font-bold uppercase tracking-wider text-neonRed hover:bg-neonRed hover:text-foreground"
      >
        <Trash2 className="mr-2 h-3.5 w-3.5" />
        Delete account
      </Button>
    );
  }

  return (
    <div className="rounded-2xl border border-neonRed/50 bg-neonRed/10 p-4">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-neonRed" />
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-neonRed">Permanently delete this account?</p>
          <p className="mt-1 text-sm text-muted-foreground">This removes your sign-in and saved account data. This cannot be undone.</p>
        </div>
      </div>
      {error && <p role="alert" className="mt-3 font-mono text-xs text-neonRed-bright">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" variant="outline" disabled={deleting} onClick={() => { setConfirming(false); setError(""); }} className="font-mono text-xs uppercase tracking-wider">Cancel</Button>
        <Button type="button" disabled={deleting} onClick={() => void handleDelete()} className="bg-neonRed font-mono text-xs font-bold uppercase tracking-wider text-foreground hover:bg-neonRed-bright">
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          {deleting ? "Deleting..." : "Yes, delete account"}
        </Button>
      </div>
    </div>
  );
}
