import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DuplicateVisitor {
  id: string;
  full_name: string;
  visit_date: string;
  phone_number: string;
}

interface DuplicateVisitorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicateVisitor: DuplicateVisitor | null;
  onMarkAsReturn: () => void;
  onCreateNew: () => void;
}

export function DuplicateVisitorDialog({
  open,
  onOpenChange,
  duplicateVisitor,
  onMarkAsReturn,
  onCreateNew,
}: DuplicateVisitorDialogProps) {
  if (!duplicateVisitor) return null;

  const visitDate = format(new Date(duplicateVisitor.visit_date), "dd 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Visitante já cadastrado</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{duplicateVisitor.full_name}</strong> já visitou em {visitDate}.
            <br />
            <br />
            Deseja marcar como retorno ou cadastrar uma nova visita?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCreateNew}>Cadastrar Nova Visita</AlertDialogCancel>
          <AlertDialogAction onClick={onMarkAsReturn}>Marcar como Retorno</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}