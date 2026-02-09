import { MessageSquare } from "lucide-react";

const CustomerMessages = () => {
  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Mensagens</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Conversas com seu consultor
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-12 flex flex-col items-center justify-center text-center">
        <MessageSquare className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="font-medium text-foreground">Nenhuma conversa</p>
        <p className="text-sm text-muted-foreground mt-1">
          Suas mensagens com o consultor aparecerão aqui.
        </p>
      </div>
    </div>
  );
};

export default CustomerMessages;
