"use client";

import { AdminChatbotPanel } from "@/components/admin/AdminChatbotPanel";
import { PermissionGate } from "@/components/shared/PermissionGate";

export default function CoordinatorChatbotPage() {
  return (
    <PermissionGate
      permissions={["chatbot.view", "chatbot.manage"]}
      require="any"
      fallback={
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 px-6 py-8 text-center text-sm text-amber-100">
          Chatbotu kullanma yetkiniz bulunmuyor.
        </div>
      }
    >
      <AdminChatbotPanel />
    </PermissionGate>
  );
}
