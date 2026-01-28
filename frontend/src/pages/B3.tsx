import { useState } from "react";

const B3 = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">B3</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Conecte sua conta da B3 para visualizar seus investimentos
          </p>
        </div>
      </div>

      {/* Coming Soon Message */}
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground text-lg">Integração B3 em breve</p>
          <p className="text-sm text-muted-foreground">
            Esta funcionalidade estará disponível em breve
          </p>
        </div>
      </div>
    </div>
  );
};

export default B3;
