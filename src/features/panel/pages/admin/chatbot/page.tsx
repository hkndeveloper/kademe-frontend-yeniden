"use client";

import { AdminChatbotPanel } from "@/components/admin/AdminChatbotPanel";
import { usePermissions } from "@/hooks/usePermissions";

export default function AdminChatbotPage() {
  const { hasGlobalScope } = usePermissions();
  const canUseChatbot = hasGlobalScope("chatbot.view") || hasGlobalScope("chatbot.manage");

  if (!canUseChatbot) {
    return (
      <div className="panel-empty-card text-amber-700">
        Yonetim chatbotuna erisim icin tum sistem kapsami gerekir.
      </div>
    );
  }

  return (
    <AdminChatbotPanel />
  );
}
