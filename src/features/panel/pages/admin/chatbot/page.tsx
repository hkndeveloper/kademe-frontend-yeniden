"use client";

import { AdminChatbotPanel } from "@/components/admin/AdminChatbotPanel";
import { usePermissions } from "@/hooks/usePermissions";

export default function AdminChatbotPage() {
  const { hasGlobalScope } = usePermissions();
  const canUseChatbot = hasGlobalScope("chatbot.view") || hasGlobalScope("chatbot.manage");

  if (!canUseChatbot) {
    return (
      <div className="panel-empty-card text-amber-700">
        Yönetim chatbotuna erişim için tüm sistem kapsamı gerekir.
      </div>
    );
  }

  return (
    <AdminChatbotPanel />
  );
}
