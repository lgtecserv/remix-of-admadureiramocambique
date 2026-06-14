import { useState, KeyboardEvent, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import StickerPicker from "./StickerPicker";

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  onTyping?: (isTyping: boolean) => void;
}

const MessageInput = ({ onSend, disabled, onTyping }: MessageInputProps) => {
  const [content, setContent] = useState("");
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSend = () => {
    if (content.trim() && !disabled) {
      onSend(content);
      setContent("");
      if (onTyping) onTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    
    if (onTyping) {
      onTyping(true);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 1000);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStickerSelect = (sticker: string) => {
    onSend(sticker);
    if (onTyping) onTyping(false);
  };

  return (
    <div className="border-t bg-background/90 backdrop-blur-sm p-3 sm:p-4 pb-safe shrink-0 shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.05)]">
      <div className="flex gap-2 items-end max-w-4xl mx-auto">
        <Textarea
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Escreva sua mensagem..."
          className="min-h-[44px] sm:min-h-[48px] max-h-[120px] resize-none text-sm rounded-2xl py-3 px-4 border-muted-foreground/20 focus-visible:ring-1 focus-visible:ring-primary/50 shadow-sm transition-shadow"
          disabled={disabled}
        />
        <div className="flex items-center gap-1.5 pb-1">
          <StickerPicker onSelect={handleStickerSelect} />
          <Button
            onClick={handleSend}
            disabled={!content.trim() || disabled}
            size="icon"
            className="shrink-0 h-[40px] w-[40px] sm:h-[44px] sm:w-[44px] rounded-full shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <Send className="h-4 w-4 ml-0.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MessageInput;
