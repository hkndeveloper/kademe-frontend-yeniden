"use client";

import { AdminChatbotPanel } from "@/components/admin/AdminChatbotPanel";
import { usePermissions } from "@/hooks/usePermissions";

export default function AdminChatbotPage() {
  const { hasGlobalScope } = usePermissions();
  const canUseChatbot = hasGlobalScope("chatbot.view") || hasGlobalScope("chatbot.manage");

  if (!canUseChatbot) {
    return (
      <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 px-6 py-8 text-center text-sm text-amber-100">
        Yonetim chatbotuna erisim icin tum sistem kapsami gerekir.
      </div>
    );
  }

  return (
    <AdminChatbotPanel />
  );
}
