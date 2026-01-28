declare global {
  interface Window {
    PluggyConnect: {
      new (config: {
        connectToken: string;
        includeSandbox?: boolean;
        onSuccess: (itemData: { id: string; [key: string]: any }) => void;
        onError: (error: any) => void;
        onClose?: () => void;
      }): {
        init: () => void;
        close: () => void;
      };
    };
  }
}

export {};
