import { AssistantChat } from "@/components/assistant/chat";

export default function AssistantPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">AI-помічник</h1>
        <p className="mt-1 text-sm text-slate-500">
          Запитайте про свої витрати звичайною мовою — відповідь рахується з ваших
          транзакцій.
        </p>
      </div>
      <AssistantChat />
    </div>
  );
}
