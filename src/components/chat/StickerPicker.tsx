import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smile } from "lucide-react";

const STICKER_PACKS = {
  emotions: ['😀', '😂', '🥰', '😎', '🤔', '😴', '😭', '🥳', '😱', '🤯'],
  gestures: ['👍', '👎', '👏', '🙏', '✌️', '🤙', '👋', '🤝', '💪', '🤌'],
  hearts: ['❤️', '💕', '💖', '💝', '💗', '💓', '💞', '💘', '🖤', '💜'],
  animals: ['🐶', '🐱', '🐼', '🦊', '🦁', '🐸', '🐵', '🦄', '🐝', '🦋'],
  celebrations: ['🎉', '🎊', '🎈', '🎁', '🎂', '🏆', '🥇', '🎯', '🎮', '🎵'],
};

interface StickerPickerProps {
  onSelect: (sticker: string) => void;
}

const StickerPicker = ({ onSelect }: StickerPickerProps) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (sticker: string) => {
    onSelect(sticker);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0 h-[40px] w-[40px] sm:h-[48px] sm:w-[48px]">
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="end">
        <Tabs defaultValue="emotions">
          <TabsList className="grid grid-cols-5 h-8 mb-2">
            <TabsTrigger value="emotions" className="text-lg p-0">😀</TabsTrigger>
            <TabsTrigger value="gestures" className="text-lg p-0">👍</TabsTrigger>
            <TabsTrigger value="hearts" className="text-lg p-0">❤️</TabsTrigger>
            <TabsTrigger value="animals" className="text-lg p-0">🐶</TabsTrigger>
            <TabsTrigger value="celebrations" className="text-lg p-0">🎉</TabsTrigger>
          </TabsList>
          {Object.entries(STICKER_PACKS).map(([pack, stickers]) => (
            <TabsContent key={pack} value={pack} className="mt-0">
              <div className="grid grid-cols-5 gap-1">
                {stickers.map((sticker) => (
                  <button
                    key={sticker}
                    onClick={() => handleSelect(sticker)}
                    className="text-2xl p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    {sticker}
                  </button>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};

export default StickerPicker;
