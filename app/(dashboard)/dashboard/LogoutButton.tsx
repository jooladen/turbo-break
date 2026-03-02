"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/lib/bknd-client";

export default function LogoutButton() {
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
    >
      로그아웃
    </button>
  );
}
