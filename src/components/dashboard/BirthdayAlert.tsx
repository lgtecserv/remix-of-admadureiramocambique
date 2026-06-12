import { useEffect, useState, useRef } from "react";
import { supabase, getDepartmentLabel } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/common/UserAvatar";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { useSelectedCongregation } from "@/contexts/SelectedCongregationContext";
interface BirthdayAlertProps {
  department?: string;
  leaderId?: string;
}

interface BirthdayMember {
  id: string;
  full_name: string;
  department: string;
  birth_date: string;
  photo_url: string | null;
  daysUntil: number;
}

const BirthdayAlert = ({ department, leaderId }: BirthdayAlertProps) => {
  const [birthdays, setBirthdays] = useState<BirthdayMember[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const birthdaySoundPlayedRef = useRef(false);
  const { getEffectiveCongregationId } = useSelectedCongregation();
  const congId = getEffectiveCongregationId();

  // Get user ID for notification settings
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const { settings } = useNotificationSettings(userId || "");
  const { playBirthdaySound } = useNotificationSound(settings);
  const loadBirthdays = async () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    let query = supabase
      .from("members")
      .select("id, full_name, department, birth_date, photo_url")
      .not("birth_date", "is", null);

    if (congId) query = query.eq("congregation_id", congId);
    if (department) query = query.eq("department", department as any);
    if (leaderId) query = query.eq("leader_id", leaderId);

    const { data } = await query;

    if (data) {
      const birthdaysThisMonth = data
        .filter((member) => {
          if (!member.birth_date) return false;
          const birthDate = new Date(member.birth_date);
          return birthDate.getMonth() + 1 === currentMonth;
        })
        .map((member) => {
          const birthDate = new Date(member.birth_date!);
          const birthDay = birthDate.getDate();
          let daysUntil = birthDay - currentDay;
          if (daysUntil < 0) return null;
          return { ...member, daysUntil } as BirthdayMember;
        })
        .filter((member): member is BirthdayMember => member !== null)
        .sort((a, b) => a.daysUntil - b.daysUntil)
        .slice(0, 10);

      setBirthdays(birthdaysThisMonth);
    }
  };

  useEffect(() => {
    loadBirthdays();

    const channel = supabase
      .channel("birthday-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "members" },
        () => loadBirthdays()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [department, leaderId, congId]);

  // Play birthday sound once per day when there are birthdays today
  useEffect(() => {
    const todayBirthdays = birthdays.filter((m) => m.daysUntil === 0);
    
    if (todayBirthdays.length > 0 && !birthdaySoundPlayedRef.current) {
      const today = new Date().toDateString();
      const storageKey = `birthday-sound-${today}`;
      
      if (!localStorage.getItem(storageKey)) {
        playBirthdaySound();
        localStorage.setItem(storageKey, "true");
        birthdaySoundPlayedRef.current = true;
      }
    }
  }, [birthdays, playBirthdaySound]);


  if (birthdays.length === 0) {
    return null;
  }

  const getCountdownBadge = (daysUntil: number) => {
    if (daysUntil === 0) {
      return (
        <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
          🎂 Hoje!
        </Badge>
      );
    }
    if (daysUntil <= 3) {
      return (
        <Badge className="bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30">
          ⏳ {daysUntil} dia{daysUntil > 1 ? "s" : ""}
        </Badge>
      );
    }
    if (daysUntil <= 7) {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
          ⏳ {daysUntil} dias
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30">
        ⏳ {daysUntil} dias
      </Badge>
    );
  };

  const formatBirthDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Cake className="h-5 w-5 text-primary" />
          🎂 Aniversariantes do Mês
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {birthdays.map((member) => (
            <div
              key={member.id}
              className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${
                member.daysUntil === 0
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-background/50 border-border/50 hover:bg-muted/50"
              }`}
            >
              <UserAvatar
                fullName={member.full_name}
                avatarUrl={member.photo_url}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{member.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {getDepartmentLabel(member.department)} • {formatBirthDate(member.birth_date)}
                </p>
              </div>
              {getCountdownBadge(member.daysUntil)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default BirthdayAlert;
