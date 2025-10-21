import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export type DateRange = {
  from: Date;
  to: Date;
};

interface DateRangeFilterProps {
  onDateRangeChange: (range: DateRange | null) => void;
}

export const DateRangeFilter = ({ onDateRangeChange }: DateRangeFilterProps) => {
  const [period, setPeriod] = useState<string>("all");
  const [customFrom, setCustomFrom] = useState<Date>();
  const [customTo, setCustomTo] = useState<Date>();

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    const now = new Date();

    switch (value) {
      case "today":
        onDateRangeChange({
          from: startOfDay(now),
          to: endOfDay(now),
        });
        break;
      case "week":
        onDateRangeChange({
          from: startOfWeek(now, { locale: ptBR }),
          to: endOfDay(now),
        });
        break;
      case "month":
        onDateRangeChange({
          from: startOfMonth(now),
          to: endOfDay(now),
        });
        break;
      case "year":
        onDateRangeChange({
          from: startOfYear(now),
          to: endOfDay(now),
        });
        break;
      case "all":
        onDateRangeChange(null);
        break;
      default:
        break;
    }
  };

  const handleCustomDateApply = () => {
    if (customFrom && customTo) {
      onDateRangeChange({
        from: startOfDay(customFrom),
        to: endOfDay(customTo),
      });
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <Select value={period} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os períodos</SelectItem>
          <SelectItem value="today">Hoje</SelectItem>
          <SelectItem value="week">Esta semana</SelectItem>
          <SelectItem value="month">Este mês</SelectItem>
          <SelectItem value="year">Este ano</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {period === "custom" && (
        <div className="flex gap-2 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {customFrom ? format(customFrom, "dd/MM/yyyy", { locale: ptBR }) : "De"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={customFrom}
                onSelect={setCustomFrom}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {customTo ? format(customTo, "dd/MM/yyyy", { locale: ptBR }) : "Até"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={customTo}
                onSelect={setCustomTo}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          <Button onClick={handleCustomDateApply} size="sm">
            Aplicar
          </Button>
        </div>
      )}
    </div>
  );
};
