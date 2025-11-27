import { useState, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

const MessageInput = ({ onSend, disabled }: MessageInputProps) => {
  const [content, setContent] = useState("");

  const handleSend = () => {
    if (content.trim() && !disabled) {
      onSend(content);
      setContent("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-card p-4">
      <div className="flex gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem... (Shift+Enter para nova linha)"
          className="min-h-[48px] sm:min-h-[60px] max-h-[100px] sm:max-h-[120px] resize-none"
          disabled={disabled}
        />
        <Button
          onClick={handleSend}
          disabled={!content.trim() || disabled}
          size="icon"
          className="shrink-0 h-[48px] w-[48px] sm:h-[60px] sm:w-[60px]"
        >
          <Send className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;
