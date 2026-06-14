import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import logoUrl from "@/assets/logo.png";

interface Member {
  id: string;
  full_name: string;
  registration_number?: string;
  church_office?: string;
  church_function?: string;
  baptism_date?: string;
  marital_status?: string;
  photo_url?: string;
  created_at: string;
  congregation_id?: string;
  member_type?: string;
}

interface GenerateCardDialogProps {
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getOfficeLabel = (value: string) => {
  const offices: Record<string, string> = {
    cooperador: "Cooperador",
    diacono: "Diácono",
    presbitero: "Presbítero",
    pastor: "Pastor",
    evangelista: "Evangelista",
    missionario: "Missionário(a)"
  };
  return offices[value] || value;
};

const getTypeLabel = (value: string) => {
  const types: Record<string, string> = {
    obreiro: "Obreiro",
    congregado: "Congregado",
    membro: "Membro"
  };
  return types[value] || value;
};

export const GenerateCardDialog = ({ member, open, onOpenChange }: GenerateCardDialogProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [loadingPng, setLoadingPng] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [congregationName, setCongregationName] = useState("SEDE");

  useEffect(() => {
    if (member?.congregation_id && open) {
      supabase
        .from("congregations")
        .select("name")
        .eq("id", member.congregation_id)
        .single()
        .then(({ data }) => {
          if (data) setCongregationName(data.name);
        });
    }
  }, [member, open]);

  if (!member) return null;

  const validDate = new Date();
  validDate.setFullYear(validDate.getFullYear() + 2); // Expiry in 2 years

  const handleDownloadPNG = async () => {
    if (!cardRef.current) return;
    setLoadingPng(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `Cartao_${member.full_name.replace(/\s+/g, "_")}.png`;
      link.href = imgData;
      link.click();
      toast.success("PNG baixado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PNG.");
    } finally {
      setLoadingPng(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!cardRef.current) return;
    setLoadingPdf(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [85.6, 53.98], // CR80 Standard credit card size
      });
      pdf.addImage(imgData, "PNG", 0, 0, 85.6, 53.98);
      pdf.save(`Cartao_${member.full_name.replace(/\s+/g, "_")}.pdf`);
      toast.success("PDF baixado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF.");
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full flex flex-col items-center">
        <DialogHeader>
          <DialogTitle>Gerar Cartão de Membro</DialogTitle>
        </DialogHeader>

        {/* Card Preview Container */}
        <div className="w-full flex justify-center py-4" style={{ height: "380px" }}>
          {/* Physical Card Layout (Credit Card Size Ratio) */}
          <div
            ref={cardRef}
            className="relative bg-white overflow-hidden shadow-2xl rounded-xl shrink-0"
            style={{ width: "856px", height: "540px", minWidth: "856px", minHeight: "540px", transform: "scale(0.65)", transformOrigin: "top center" }}
          >
            {/* Minimalist Background */}
            <div className="absolute inset-0 bg-slate-50"></div>

            {/* Left Vertical Bar (Blue from logo) */}
            <div className="absolute top-0 left-0 bottom-0 w-12 bg-[#1A365D] flex items-center justify-center z-10">
              <span className="text-white font-black text-xl tracking-[0.2em] uppercase whitespace-nowrap" style={{ transform: "rotate(-90deg)" }}>
                Assembleia de Deus
              </span>
            </div>

            {/* Top Header - clean */}
            <div className="absolute top-0 left-12 right-0 h-28 bg-white flex items-center px-8 z-20 border-b border-slate-200">
              <div className="h-20 w-auto mr-6 flex-shrink-0">
                <img src={logoUrl} alt="Logo" className="h-full object-contain" crossOrigin="anonymous" />
              </div>
              <div className="flex flex-col justify-center pt-2">
                <h1 className="text-[#1A365D] text-[2rem] font-black uppercase tracking-widest leading-none mb-1">
                  Cartão de Membro
                </h1>
                <p className="text-yellow-600 text-lg font-bold uppercase tracking-widest">
                  AD Madureira Moçambique
                </p>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="absolute top-36 left-20 right-8 bottom-20 flex gap-8 z-20">
              
              {/* Photo */}
              <div className="w-36 h-48 bg-gray-200 rounded-md border-2 border-slate-300 shadow-sm overflow-hidden flex-shrink-0">
                {member.photo_url ? (
                  <img src={member.photo_url} alt="Foto do membro" className="w-full h-full object-cover" crossOrigin="anonymous" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                  </div>
                )}
              </div>

              {/* Info Details */}
              <div className="flex-1 flex flex-col pt-1">
                {/* Name and Role */}
                <div className="mb-4">
                  <h2 className="text-[1.75rem] font-black text-[#1A365D] uppercase leading-tight mb-1">
                    {member.full_name}
                  </h2>
                  <p className="text-xl font-bold text-yellow-600 uppercase tracking-widest">
                    {member.church_office ? getOfficeLabel(member.church_office) : getTypeLabel(member.member_type || "membro")}
                    {member.church_function ? ` - ${member.church_function}` : ""}
                  </p>
                </div>

                {/* Grid Info */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="border-b border-slate-200 pb-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Matrícula</p>
                    <p className="text-lg font-black text-[#1A365D]">{member.registration_number || "—"}</p>
                  </div>
                  <div className="border-b border-slate-200 pb-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Congregação</p>
                    <p className="text-lg font-black text-[#1A365D] uppercase leading-tight">{congregationName}</p>
                  </div>
                  <div className="border-b border-slate-200 pb-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Data de Batismo</p>
                    <p className="text-lg font-bold text-[#1A365D]">
                      {member.baptism_date ? format(new Date(member.baptism_date + "T00:00:00"), "dd/MM/yyyy") : "—"}
                    </p>
                  </div>
                  <div className="border-b border-slate-200 pb-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Estado Civil</p>
                    <p className="text-lg font-bold text-[#1A365D] uppercase">{member.marital_status || "—"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Legal Text */}
            <div className="absolute top-[360px] left-20 right-8 z-20">
              <p className="text-[11px] leading-relaxed text-slate-600 text-justify font-medium">
                A presente credencial identifica oficialmente o portador como membro autorizado da Igreja, sendo pessoal e intransferível. Seu uso está condicionado à observância dos princípios da Igreja e da Palavra de Deus, devendo ser devolvida em caso de desligamento ou perda do vínculo com a instituição.
              </p>
            </div>

            {/* Bottom Footer Area */}
            <div className="absolute bottom-0 left-12 right-0 h-24 bg-slate-100 flex items-center justify-between px-8 z-10 border-t border-slate-200">
              <div className="flex gap-8">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Emissão</p>
                  <p className="text-base font-black text-[#1A365D]">{format(new Date(), "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Validade</p>
                  <p className="text-base font-black text-[#1A365D]">{format(validDate, "dd/MM/yyyy")}</p>
                </div>
              </div>
              <div className="flex gap-8 h-full items-end pb-5">
                <div className="flex flex-col items-center">
                  <div className="w-48 border-b border-slate-800 mb-1.5"></div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Dirigente Local</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-48 border-b border-slate-800 mb-1.5"></div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Pastor da Igreja</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-2">
          <Button onClick={handleDownloadPNG} disabled={loadingPng || loadingPdf} className="gap-2">
            {loadingPng ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Baixar PNG
          </Button>
          <Button onClick={handleDownloadPDF} disabled={loadingPng || loadingPdf} variant="secondary" className="gap-2">
            {loadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Baixar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
