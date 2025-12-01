import { createContext, useContext, useState, ReactNode } from "react";

interface ActiveConversationContextType {
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
}

const ActiveConversationContext = createContext<ActiveConversationContextType | undefined>(undefined);

export const ActiveConversationProvider = ({ children }: { children: ReactNode }) => {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  return (
    <ActiveConversationContext.Provider value={{ activeConversationId, setActiveConversationId }}>
      {children}
    </ActiveConversationContext.Provider>
  );
};

export const useActiveConversation = () => {
  const context = useContext(ActiveConversationContext);
  if (!context) {
    throw new Error("useActiveConversation must be used within ActiveConversationProvider");
  }
  return context;
};
