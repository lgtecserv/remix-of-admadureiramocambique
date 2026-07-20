import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import logoUrl from "@/assets/logo.png";

interface Member {
  id: string;
  full_name: string;
  phone_number?: string;
  registration_number?: string;
  church_office?: string;
  church_function?: string;
  baptism_date?: string;
  marital_status?: string;
  photo_url?: string;
  created_at: string;
  congregation_id?: string;
  member_type?: string;
  gender?: string;
}

interface GenerateCardDialogProps {
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getOfficeLabel = (value: string, gender?: string) => {
  const isFemale = gender === "feminino";
  const offices: Record<string, string> = {
    cooperador: isFemale ? "Cooperadora" : "Cooperador",
    diacono: isFemale ? "Diaconisa" : "Diácono",
    presbitero: isFemale ? "Presbítera" : "Presbítero",
    pastor: isFemale ? "Pastora" : "Pastor",
    evangelista: "Evangelista",
    missionario: isFemale ? "Missionária" : "Missionário(a)"
  };
  return offices[value] || value;
};

const getMaritalStatusLabel = (value: string, gender?: string) => {
  const isFemale = gender === "feminino";
  const statuses: Record<string, string> = {
    solteiro: isFemale ? "Solteira" : "Solteiro",
    casado: isFemale ? "Casada" : "Casado",
    divorciado: isFemale ? "Divorciada" : "Divorciado",
    viuvo: isFemale ? "Viúva" : "Viúvo"
  };
  return statuses[value] || value;
};

const getTypeLabel = (value: string, gender?: string) => {
  const isFemale = gender === "feminino";
  const types: Record<string, string> = {
    obreiro: "Membro", // Legacy fallback
    congregado: isFemale ? "Congregada" : "Congregado",
    membro: "Membro"
  };
  return types[value] || value;
};

export const GenerateCardDialog = ({ member, open, onOpenChange }: GenerateCardDialogProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);
  
  const [loadingPng, setLoadingPng] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [congregationName, setCongregationName] = useState("SEDE");
  const [pastorPhone, setPastorPhone] = useState("—");

  useEffect(() => {
    if (member?.congregation_id && open) {
      supabase
        .from("congregations")
        .select("name, phone")
        .eq("id", member.congregation_id)
        .single()
        .then(({ data }) => {
          if (data) {
            setCongregationName(data.name);
            setPastorPhone(data.phone || "—");
          }
        });
    }
  }, [member, open]);

  if (!member) return null;

  const validDate = new Date();
  validDate.setFullYear(validDate.getFullYear() + 2); // Expiry in 2 years

  const handleDownloadPNG = async () => {
    if (!containerRef.current) return;
    setLoadingPng(true);
    try {
      const dataUrl = await toPng(containerRef.current, {
        cacheBust: true,
        pixelRatio: 4, // 4K quality
        style: {
          transform: 'none'
        }
      });
      const link = document.createElement("a");
      link.download = `Cartao_${member.full_name.replace(/\\s+/g, "_")}.png`;
      link.href = dataUrl;
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
    if (!frontCardRef.current || !backCardRef.current) return;
    setLoadingPdf(true);
    try {
      // Configs for the toPng function
      const config = {
        cacheBust: true,
        pixelRatio: 4, 
        width: 856,
        height: 540,
        style: { transform: 'none' }
      };

      const frontDataUrl = await toPng(frontCardRef.current, config);
      const backDataUrl = await toPng(backCardRef.current, config);

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [85.6, 53.98], // CR80 Standard credit card size
      });
      
      // Page 1: Front
      pdf.addImage(frontDataUrl, "PNG", 0, 0, 85.6, 53.98);
      
      // Page 2: Back
      pdf.addPage();
      pdf.addImage(backDataUrl, "PNG", 0, 0, 85.6, 53.98);

      pdf.save(`Cartao_${member.full_name.replace(/\\s+/g, "_")}.pdf`);
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
      <DialogContent className="max-w-2xl w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto flex flex-col items-center mx-auto">
        <DialogHeader>
          <DialogTitle>Gerar Cartão de Membro</DialogTitle>
        </DialogHeader>

        {/* Card Preview Container */}
        <div className="w-full flex justify-center py-4 relative" style={{ minHeight: "800px" }}>
          
          <div 
            ref={containerRef} 
            className="flex flex-col gap-4 items-center"
            style={{ transform: "scale(0.65)", transformOrigin: "top center" }}
          >
            {/* FRONT OF THE CARD */}
            <div
              id="card-front"
              ref={frontCardRef}
              className="relative bg-white overflow-hidden shadow-2xl rounded-xl shrink-0"
              style={{ width: "856px", height: "540px", minWidth: "856px", minHeight: "540px" }}
            >
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
                    MINISTÉRIO MADUREIRA
                  </p>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="absolute top-36 left-20 right-8 bottom-20 flex gap-8 z-20">
                
                {/* Photo */}
                <div className="w-36 h-48 bg-gray-200 rounded-md border-2 border-slate-300 shadow-sm overflow-hidden flex-shrink-0">
                  {member.photo_url ? (
                    <div 
                      className="w-full h-full" 
                      style={{ 
                        backgroundImage: `url(${member.photo_url})`, 
                        backgroundSize: 'cover', 
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                      }} 
                    />
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
                      {member.church_office ? getOfficeLabel(member.church_office, member.gender) : getTypeLabel(member.member_type || "membro")}
                      {member.church_function ? ` - ${member.church_function}` : ""}
                    </p>
                  </div>

                  {/* Grid Info */}
                  <div className="grid grid-cols-3 gap-x-4 gap-y-4">
                    <div className="border-b border-slate-200 pb-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Matrícula</p>
                      <p className="text-lg font-black text-[#1A365D]">{member.registration_number || "—"}</p>
                    </div>
                    <div className="border-b border-slate-200 pb-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Congregação</p>
                      <p className="text-lg font-black text-[#1A365D] uppercase leading-tight">{congregationName}</p>
                    </div>
                    <div className="border-b border-slate-200 pb-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Celular</p>
                      <p className="text-lg font-bold text-[#1A365D] uppercase">{member.phone_number || "—"}</p>
                    </div>
                    <div className="border-b border-slate-200 pb-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Data de Batismo</p>
                      <p className="text-lg font-bold text-[#1A365D]">
                        {member.baptism_date ? format(new Date(member.baptism_date + "T00:00:00"), "dd/MM/yyyy") : "—"}
                      </p>
                    </div>
                    <div className="border-b border-slate-200 pb-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Estado Civil</p>
                      <p className="text-lg font-bold text-[#1A365D] uppercase">{member.marital_status ? getMaritalStatusLabel(member.marital_status, member.gender) : "—"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* BIG VISIBLE TEXT where warning was */}
              <div className="absolute top-[370px] left-20 right-8 z-20 flex justify-center items-center">
                <p className="text-2xl font-black text-[#1A365D] uppercase tracking-[0.15em] opacity-80 border-t-2 border-b-2 border-slate-300 py-2 px-8">
                  Igreja Ponissa Vana Va Moçambique
                </p>
              </div>

              {/* Bottom Footer Area */}
              <div className="absolute bottom-0 left-12 right-0 h-20 bg-slate-100 flex items-center justify-between px-8 z-10 border-t border-slate-200">
                <div className="flex gap-12 w-full justify-center">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Emissão</p>
                    <p className="text-base font-black text-[#1A365D]">{format(new Date(), "dd/MM/yyyy")}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Validade</p>
                    <p className="text-base font-black text-[#1A365D]">{format(validDate, "dd/MM/yyyy")}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* BACK OF THE CARD */}
            <div
              id="card-back"
              ref={backCardRef}
              className="relative bg-white overflow-hidden shadow-2xl rounded-xl shrink-0 border border-slate-200"
              style={{ width: "856px", height: "540px", minWidth: "856px", minHeight: "540px" }}
            >
              {/* Minimalist Background Pattern for Back */}
              <div className="absolute inset-0 bg-slate-50 opacity-50"></div>
              
              {/* Watermark Logo (Optional, very subtle) */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] z-0 pointer-events-none">
                <img src={logoUrl} alt="" className="w-96 h-96 object-contain grayscale" crossOrigin="anonymous" />
              </div>

              <div className="absolute inset-8 flex flex-col justify-between z-10">
                
                {/* Legal Texts Area */}
                <div className="space-y-6 pt-4 px-6 text-justify">
                  <p className="text-sm leading-relaxed text-slate-800 font-bold tracking-tight">
                    A presente credencial identifica oficialmente o portador como membro autorizado da Igreja, sendo pessoal e intransferível. Seu uso está condicionado à observância dos princípios da Igreja e da Palavra de Deus, devendo ser devolvida em caso de desligamento ou perda do vínculo com a instituição.
                  </p>
                  <p className="text-sm leading-relaxed text-slate-700 font-semibold tracking-tight border-l-4 border-yellow-500 pl-4 bg-slate-100 py-3 pr-3">
                    <span className="font-black text-[#1A365D]">Aviso Legal:</span> A presente credencial é de uso restrito e interno da Igreja. Este documento NÃO substitui o Bilhete de Identidade (BI) Nacional, Passaporte ou qualquer outro documento oficial de identificação civil emitido pelo Estado.
                  </p>
                </div>

                {/* Stamp Area - Center Right */}
                <div className="absolute top-[50%] left-[50%] -translate-x-[50%] -translate-y-[40%] flex flex-col items-center justify-center">
                  <div className="w-36 h-36 border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center bg-slate-50/80 backdrop-blur-sm shadow-sm">
                    <span className="text-slate-400 font-bold text-xs uppercase tracking-widest opacity-70 text-center">Espaço para<br/>Carimbo</span>
                  </div>
                </div>

                {/* Signatures & Contacts Footer */}
                <div className="mt-auto flex justify-between items-end px-4 pb-4">
                  {/* General Secretary */}
                  <div className="flex flex-col items-center">
                    <div className="w-56 border-b border-slate-800 mb-2"></div>
                    <p className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">Secretário Geral</p>
                    <p className="text-[10px] font-semibold text-slate-500 mt-1">Contato: +258 87 825 5110</p>
                  </div>
                  
                  {/* Congregation Pastor */}
                  <div className="flex flex-col items-center">
                    <div className="w-56 border-b border-slate-800 mb-2"></div>
                    <p className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">Pastor da Igreja</p>
                    <p className="text-[10px] font-semibold text-slate-500 mt-1">Contato: {pastorPhone}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="flex gap-4 mt-2">
          <Button onClick={handleDownloadPNG} disabled={loadingPng || loadingPdf} className="gap-2">
            {loadingPng ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Baixar PNG (Frente e Verso)
          </Button>
          <Button onClick={handleDownloadPDF} disabled={loadingPng || loadingPdf} variant="secondary" className="gap-2">
            {loadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Baixar PDF (2 Páginas)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
