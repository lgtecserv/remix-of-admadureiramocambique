import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  avatarUrl?: string | null;
  fullName?: string;
  size?: 'sm' | 'md' | 'lg';
  showOnline?: boolean;
  isOnline?: boolean;
  className?: string;
}

export const UserAvatar = ({
  avatarUrl,
  fullName = "U",
  size = 'md',
  showOnline = false,
  isOnline = false,
  className
}: UserAvatarProps) => {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-16 w-16 text-lg'
  };

  const getInitials = () => {
    if (!fullName) return "U";
    const words = fullName.trim().split(" ");
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return fullName.charAt(0).toUpperCase();
  };

  return (
    <div className="relative inline-block">
      <Avatar className={cn(sizeClasses[size], className)}>
        {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
        <AvatarFallback className="bg-primary/10 text-primary font-medium">
          {getInitials()}
        </AvatarFallback>
      </Avatar>
      {showOnline && isOnline && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
      )}
    </div>
  );
};
