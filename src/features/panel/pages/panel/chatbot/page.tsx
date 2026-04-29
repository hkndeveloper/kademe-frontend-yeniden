"use client";

import AdminChatbotPage from "@/features/panel/pages/admin/chatbot/page";
import CoordinatorChatbotPage from "@/features/panel/pages/coordinator/chatbot/page";
import { useAuth } from "@/store/useAuth";

export default function PanelChatbotPage() {
  const role = useAuth((s) => s.user?.role);
  if (role === "coordinator") return <CoordinatorChatbotPage />;
  return <AdminChatbotPage />;
}
