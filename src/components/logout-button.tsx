"use client";

export default function LogoutButton() {
  async function onClick() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }
  return (
    <button onClick={onClick} className="btn-ghost text-sm">
      Sign out
    </button>
  );
}
