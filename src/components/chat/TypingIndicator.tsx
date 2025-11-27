interface TypingIndicatorProps {
  users: Array<{ user_id: string; full_name: string }>;
}

const TypingIndicator = ({ users }: TypingIndicatorProps) => {
  if (users.length === 0) return null;

  const names = users.map((u) => u.full_name).join(", ");
  const text = users.length === 1 ? "está digitando..." : "estão digitando...";

  return (
    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground px-3 sm:px-4 py-2">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span className="truncate">
        {names} {text}
      </span>
    </div>
  );
};

export default TypingIndicator;
