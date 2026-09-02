import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toPng } from "html-to-image";
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
  baptism_date?: string | null;
  marital_status?: string;
  photo_url?: string;
  created_at: string;
  congregation_id?: string;
  member_type?: string;
  gender?: string;
}

interface BulkGenerateCardsDialogProps {
  members: Member[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
}

const TRANSPARENT_PLACEHOLDER = "data:image/png;base64,iVBORw0KGgoAAAANSU5CYII=";

const convertUrlToBase64 = async (url: string): Promise<string | null> => {
  if (!url) return null;
  if (url.startsWith("data:")) return url;

  if (url.includes("supabase.co") && url.includes("/storage/v1/object/")) {
    try {
      const urlObj = new URL(url);
      const pathnameParts = urlObj.pathname.split("/object/public/");
      if (pathnameParts.length > 1) {
        const fullStoragePath = pathnameParts[1];
        const slashIndex = fullStoragePath.indexOf("/");
        if (slashIndex !== -1) {
          const bucket = fullStoragePath.substring(0, slashIndex);
          const path = fullStoragePath.substring(slashIndex + 1);

          const { data, error } = await supabase.storage.from(bucket).download(path);
          if (!error && data) {
            return await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(data);
            });
          }
        }
      }
    } catch (e) {
      console.warn("Supabase SDK storage download failed, falling back to fetch:", e);
    }
  }

  try {
    const response = await fetch(url, { mode: "cors" });
    if (response.ok) {
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  } catch (e) {
    console.warn("Fetch base64 conversion failed, trying Image element fallback:", e);
  }

  return new Promise<string | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
          return;
        }
      } catch (err) {
        console.warn("Canvas toDataURL failed:", err);
      }
      resolve(null);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

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
    obreiro: "Membro",
    congregado: isFemale ? "Congregada" : "Congregado",
    membro: "Membro"
  };
  return types[value] || value;
};

export const BulkGenerateCardsDialog = ({ members, open, onOpenChange, onClose }: BulkGenerateCardsDialogProps) => {
  const frontPageRef = useRef<HTMLDivElement>(null);
  const backPageRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  
  const [congregations, setCongregations] = useState<Record<string, {name: string, phone: string}>>({});
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [photosBase64, setPhotosBase64] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!open || members.length === 0) return;

    const loadData = async () => {
      setReady(false);
      
      const logoB64 = await convertUrlToBase64(logoUrl);
      setLogoBase64(logoB64);

      const congregationIds = [...new Set(members.map(m => m.congregation_id).filter(Boolean))] as string[];
      if (congregationIds.length > 0) {
        const { data } = await supabase
          .from("congregations")
          .select("id, name, phone")
          .in("id", congregationIds);
          
        if (data) {
          const congMap: Record<string, {name: string, phone: string}> = {};
          data.forEach(c => {
            congMap[c.id] = { name: c.name, phone: c.phone || "—" };
          });
          setCongregations(congMap);
        }
      }

      const photosMap: Record<string, string | null> = {};
      await Promise.all(members.map(async (member) => {
        if (member.photo_url) {
          photosMap[member.id] = await convertUrlToBase64(member.photo_url);
        } else {
          photosMap[member.id] = null;
        }
      }));
      setPhotosBase64(photosMap);
      
      setReady(true);
    };

    loadData();
  }, [members, open]);

  const cardConfig = {
    cacheBust: false,
    pixelRatio: 1, 
    width: 2480,
    height: 3508,
    style: { transform: 'none' },
    imagePlaceholder: TRANSPARENT_PLACEHOLDER,
    fetchRequestInit: { mode: 'cors' as RequestMode }
  };

  const handleDownloadPNG = async () => {
    if (!frontPageRef.current || !backPageRef.current) return;
    setLoading(true);
    try {
      const frontDataUrl = await toPng(frontPageRef.current, cardConfig);
      const backDataUrl = await toPng(backPageRef.current, cardConfig);

      const linkFront = document.createElement("a");
      linkFront.download = `Lote_Cartoes_Frentes.png`;
      linkFront.href = frontDataUrl;
      document.body.appendChild(linkFront);
      linkFront.click();
      document.body.removeChild(linkFront);

      setTimeout(() => {
        const linkBack = document.createElement("a");
        linkBack.download = `Lote_Cartoes_Versos.png`;
        linkBack.href = backDataUrl;
        document.body.appendChild(linkBack);
        linkBack.click();
        document.body.removeChild(linkBack);
      }, 500);

      toast.success("PNGs baixados com sucesso!");
      onClose();
    } catch (err) {
      console.error("Erro ao gerar PNG em lote:", err);
      toast.error("Erro ao gerar PNG em lote.");
    } finally {
      setLoading(false);
    }
  };

  if (members.length === 0) return null;

  const validDate = new Date();
  validDate.setFullYear(validDate.getFullYear() + 2); 

  const currentLogoSrc = logoBase64 || logoUrl;

  const renderFrontCard = (member: Member) => {
    const congInfo = member.congregation_id && congregations[member.congregation_id] ? congregations[member.congregation_id] : { name: "SEDE", phone: "—" };
    const currentPhotoSrc = photosBase64[member.id] || member.photo_url;
    
    return (
      <div className="relative bg-white overflow-hidden shadow-sm rounded-xl shrink-0 border border-slate-200" style={{ width: "856px", height: "540px" }}>
        <div className="absolute inset-0 bg-slate-50"></div>
        <div className="absolute top-0 left-0 bottom-0 w-12 bg-[#1A365D] flex items-center justify-center z-10">
          <span className="text-white font-black text-xl tracking-[0.2em] uppercase whitespace-nowrap" style={{ transform: "rotate(-90deg)" }}>
            Ministério Madureira
          </span>
        </div>
        <div className="absolute top-0 left-12 right-0 h-28 bg-white flex items-center px-8 z-20 border-b border-slate-200">
          <div className="h-20 w-auto mr-6 flex-shrink-0 flex items-center">
            <img src={currentLogoSrc} alt="Logo" className="h-full object-contain" />
          </div>
          <div className="flex flex-col justify-center pt-2">
            <h1 className="text-[#1A365D] text-[2rem] font-black uppercase tracking-widest leading-none mb-1">
              Cartão de Membro
            </h1>
            <p className="text-yellow-600 text-lg font-bold uppercase tracking-widest">
              ASSEMBLEIA DE DEUS
            </p>
          </div>
        </div>
        <div className="absolute top-36 left-20 right-8 bottom-20 flex gap-8 z-20">
          <div className="w-36 h-48 bg-gray-200 rounded-md border-2 border-slate-300 shadow-sm overflow-hidden flex-shrink-0">
            {currentPhotoSrc ? (
              <img src={currentPhotoSrc} alt={member.full_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1 flex flex-col pt-1">
            <div className="mb-4">
              <h2 className="text-[1.75rem] font-black text-[#1A365D] uppercase leading-tight mb-1">{member.full_name}</h2>
              <p className="text-xl font-bold text-yellow-600 uppercase tracking-widest">
                {member.church_office ? getOfficeLabel(member.church_office, member.gender) : getTypeLabel(member.member_type || "membro")}
                {member.church_function ? ` - ${member.church_function}` : ""}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-4">
              <div className="border-b border-slate-200 pb-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Matrícula</p>
                <p className="text-lg font-black text-[#1A365D]">{member.registration_number || "—"}</p>
              </div>
              <div className="border-b border-slate-200 pb-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Congregação</p>
                <p className="text-lg font-black text-[#1A365D] uppercase leading-tight">{congInfo.name}</p>
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
        <div className="absolute top-[370px] left-20 right-8 z-20 flex justify-center items-center">
          <p className="text-2xl font-black text-[#1A365D] uppercase tracking-[0.15em] opacity-80 border-t-2 border-b-2 border-slate-300 py-2 px-8">
            Igreja Ponissa Vana Va Moçambique
          </p>
        </div>
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
    );
  };

  const renderBackCard = (member: Member) => {
    const congInfo = member.congregation_id && congregations[member.congregation_id] ? congregations[member.congregation_id] : { name: "SEDE", phone: "—" };

    return (
      <div className="relative bg-white overflow-hidden shadow-sm rounded-xl shrink-0 border border-slate-200" style={{ width: "856px", height: "540px" }}>
        <div className="absolute inset-0 bg-slate-50 opacity-50"></div>
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.12] z-0 pointer-events-none">
          <img src={currentLogoSrc} alt="" className="w-[500px] h-[500px] object-contain" />
        </div>
        <div className="absolute inset-8 flex flex-col justify-between z-10">
          <div className="space-y-6 pt-4 px-6 text-justify">
            <p className="text-sm leading-relaxed text-slate-800 font-bold tracking-tight">
              A presente credencial identifica oficialmente o portador como membro autorizado da Igreja, sendo pessoal e intransferível. Seu uso está condicionado à observância dos princípios da Igreja e da Palavra de Deus, devendo ser devolvida em caso de desligamento ou perda do vínculo com a instituição.
            </p>
            <p className="text-sm leading-relaxed text-slate-700 font-semibold tracking-tight border-l-4 border-yellow-500 pl-4 bg-slate-100 py-3 pr-3">
              <span className="font-black text-[#1A365D]">Aviso Legal:</span> A presente credencial é de uso restrito e interno da Igreja. Este documento NÃO substitui o Bilhete de Identidade (BI) Nacional, Passaporte ou qualquer outro documento oficial de identificação civil emitido pelo Estado.
            </p>
          </div>
          <div className="absolute top-[50%] left-[50%] -translate-x-[50%] -translate-y-[40%] flex flex-col items-center justify-center">
            <div className="w-36 h-36 border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center bg-slate-50/80 backdrop-blur-sm shadow-sm">
              <span className="text-slate-400 font-bold text-xs uppercase tracking-widest opacity-70 text-center">Espaço para<br/>Carimbo</span>
            </div>
          </div>
          <div className="mt-auto flex justify-between items-end px-4 pb-4">
            <div className="flex flex-col items-center">
              <div className="w-56 border-b border-slate-800 mb-2"></div>
              <p className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">Secretário Geral</p>
              <p className="text-[10px] font-semibold text-slate-500 mt-1">Contato: +258 87 825 5110</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-56 border-b border-slate-800 mb-2"></div>
              <p className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">Pastor da Igreja</p>
              <p className="text-[10px] font-semibold text-slate-500 mt-1">Contato: {congInfo.phone}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const backLayoutMembers = [];
  for (let i = 0; i < members.length; i += 2) {
    if (i + 1 < members.length) {
      backLayoutMembers.push(members[i + 1], members[i]);
    } else {
      backLayoutMembers.push(null, members[i]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)] flex flex-col items-center mx-auto">
        <DialogHeader className="w-full text-center">
          <DialogTitle>Imprimir Cartões em Lote ({members.length}/8)</DialogTitle>
          <DialogDescription>
            {ready ? "Os cartões estão prontos para serem baixados." : "Preparando os cartões... aguarde."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 w-full">
          <Button onClick={handleDownloadPNG} disabled={loading || !ready} className="gap-2 w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {loading ? "Gerando folhas..." : "Baixar PNG (Frentes e Versos)"}
          </Button>
        </div>

        <div className="fixed opacity-0 pointer-events-none -z-50" style={{ left: "-9999px", top: "-9999px" }}>
          <div 
            ref={frontPageRef}
            className="bg-white flex flex-wrap content-start"
            style={{ 
              width: "2480px", 
              height: "3508px",
              paddingTop: "140px",
              paddingLeft: "240px",
              gap: "80px 240px" 
            }}
          >
            {members.map((member, i) => (
              <div key={`front-${member.id}-${i}`}>
                {renderFrontCard(member)}
              </div>
            ))}
          </div>

          <div 
            ref={backPageRef}
            className="bg-white flex flex-wrap content-start"
            style={{ 
              width: "2480px", 
              height: "3508px",
              paddingTop: "140px",
              paddingLeft: "240px",
              gap: "80px 240px" 
            }}
          >
            {backLayoutMembers.map((member, index) => (
              <div key={`back-${index}`} style={{ width: "856px", height: "540px" }}>
                {member ? renderBackCard(member) : null}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
