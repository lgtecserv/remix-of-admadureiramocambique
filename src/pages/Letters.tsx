import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import AppLayout from "@/components/layout/AppLayout";
import PageLoader from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Download, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import logoUrl from "@/assets/logo.png";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const LETTER_TEMPLATES: Record<string, { title: string, content: string }> = {
  recomendacao: {
    title: "CARTA DE RECOMENDAÇÃO",
    content: "A Paz do Senhor!\n\nRecomendamos a(o) amada(o) irmã(o) [NOME DO MEMBRO], membro em plena comunhão com nossa igreja, para que seja recebida(o) no amor de Cristo. Solicitamos que lhe sejam concedidas todas as oportunidades e privilégios espirituais inerentes à sua condição de membro, bem como a devida assistência cristã.\n\nSem mais para o momento, subscrevemo-nos no amor fraternal."
  },
  transferencia: {
    title: "CARTA DE TRANSFERÊNCIA",
    content: "A Paz do Senhor!\n\nPor meio desta, concedemos transferência à(ao) amada(o) irmã(o) [NOME DO MEMBRO], que até a presente data foi membro em plena comunhão com nossa igreja. A partir desta data, a(o) referida(o) irmã(o) passará a congregar nessa amada congregação, ficando sob vossos cuidados espirituais.\n\nPedimos que a(o) recebam no amor de Cristo, concedendo-lhe os privilégios cristãos."
  },
  convite: {
    title: "CARTA DE CONVITE",
    content: "A Paz do Senhor!\n\nÉ com grande alegria que a Assembleia de Deus Madureira Moçambique convida o(a) amado(a) [NOME DO DESTINATÁRIO] para participar de um culto especial de adoração a Deus, que se realizará no nosso templo sede.\n\nContamos com a sua honrosa presença, acreditando que será um momento de grande renovo e poder de Deus."
  },
  livre: {
    title: "ASSUNTO DA CARTA",
    content: "Escreva o corpo da carta aqui..."
  }
};

const Letters = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [letterType, setLetterType] = useState("recomendacao");
  const [recipient, setRecipient] = useState("");
  const [content, setContent] = useState(LETTER_TEMPLATES["recomendacao"].content);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      const [roleResult, profileResult] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("profiles").select("full_name").eq("id", session.user.id).maybeSingle(),
      ]);

      const userRole = roleResult.data?.role;
      setRole(userRole);

      // Apenas secretário, super_admin e pastor têm acesso a esta página
      if (
        userRole !== "secretary" && 
        userRole !== "secretário" && 
        userRole !== "secretario" && 
        userRole !== "super_admin" && 
        userRole !== "super-admin" && 
        userRole !== "admin" && 
        userRole !== "pastor"
      ) {
        navigate("/dashboard");
        return;
      }

      if (profileResult.data) {
        setProfile(profileResult.data);
      }

      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const handleTemplateChange = (val: string) => {
    setLetterType(val);
    const templateContent = LETTER_TEMPLATES[val].content;
    const prefilledContent = templateContent.replace(/\[NOME DO MEMBRO\]|\[NOME DO DESTINATÁRIO\]/g, recipient || "[NOME]");
    setContent(prefilledContent);
  };

  const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRecipient(val);
  };

  const handleGeneratePDF = async () => {
    if (!pdfRef.current) return;
    setGeneratingPdf(true);
    
    try {
      const canvas = await html2canvas(pdfRef.current, { 
        scale: 2, 
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Carta_${letterType}_${format(new Date(), "yyyyMMdd")}.pdf`);
      
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar o PDF. Tente novamente.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  const currentDateFormatted = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <AppLayout userName={profile?.full_name} role={role || undefined}>
      <div className="space-y-6 animate-fade-in pb-20">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
            <FileText className="w-8 h-8 text-primary" />
            Emissão de Cartas
          </h2>
          <p className="text-muted-foreground">
            Crie cartas de recomendação, transferência e outros documentos oficiais.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulário de Preenchimento */}
          <Card className="shadow-lg h-fit">
            <CardHeader>
              <CardTitle>Configurar Documento</CardTitle>
              <CardDescription>Preencha os campos para visualizar a prévia do documento.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="letter-type">Tipo de Carta</Label>
                <Select value={letterType} onValueChange={handleTemplateChange}>
                  <SelectTrigger id="letter-type">
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recomendacao">Carta de Recomendação</SelectItem>
                    <SelectItem value="transferencia">Carta de Transferência</SelectItem>
                    <SelectItem value="convite">Carta Convite</SelectItem>
                    <SelectItem value="livre">Texto Livre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipient">Nome do Membro / Destinatário</Label>
                <Input 
                  id="recipient" 
                  placeholder="Ex: João da Silva" 
                  value={recipient}
                  onChange={handleRecipientChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Conteúdo da Carta</Label>
                <Textarea 
                  id="content"
                  className="min-h-[300px] resize-y"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleGeneratePDF} 
                disabled={generatingPdf} 
                className="w-full gap-2"
              >
                {generatingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {generatingPdf ? "Gerando PDF..." : "Baixar PDF"}
              </Button>
            </CardContent>
          </Card>

          {/* Visualização de Prévia (estilo folha A4) */}
          <div className="flex flex-col items-center">
            <h3 className="font-semibold text-lg mb-4 text-center">Prévia do Documento</h3>
            
            {/* 
              A4 Container Ratio (1:1.414)
              We scale it down for visual preview, but the actual node has a fixed 794px width.
            */}
            <div className="w-full max-w-[500px] overflow-hidden border border-slate-300 shadow-xl bg-white flex justify-center">
              <div 
                ref={pdfRef}
                className="bg-white px-16 py-20 relative shrink-0 flex flex-col"
                style={{ 
                  width: "794px", 
                  minHeight: "1123px", 
                  transform: "scale(0.62)", // Scale down to fit standard screens visually
                  transformOrigin: "top center",
                  marginBottom: "-40%" // compensate for the scaled height
                }}
              >
                {/* Watermark Background */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden">
                  <img 
                    src={logoUrl} 
                    alt="Watermark" 
                    className="w-[70%] opacity-20 object-contain" 
                    crossOrigin="anonymous" 
                  />
                </div>

                {/* Header with Logo */}
                <div className="flex flex-col items-center justify-center mb-12 relative z-10">
                  <img src={logoUrl} alt="Logo" className="h-28 object-contain mb-4" crossOrigin="anonymous" />
                  <h1 className="text-xl font-bold uppercase tracking-widest text-center" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                    Igreja Evangélica Assembleia de Deus
                  </h1>
                  <h2 className="text-lg font-bold uppercase tracking-wider text-center" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                    Ministério de Madureira em Moçambique
                  </h2>
                </div>

                {/* Letter Title */}
                <h3 className="text-2xl font-bold text-center underline uppercase mb-12 relative z-10" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                  {LETTER_TEMPLATES[letterType]?.title || "CARTA"}
                </h3>

                {/* Content */}
                <div 
                  className="whitespace-pre-wrap text-lg mb-12 relative z-10"
                  style={{ 
                    fontFamily: "'Times New Roman', Times, serif", 
                    lineHeight: "1.5", 
                    textAlign: "justify" 
                  }}
                >
                  {content}
                </div>

                {/* Date */}
                <div className="text-right text-lg mb-24 relative z-10" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                  Maputo, {currentDateFormatted}
                </div>

                {/* Signatures */}
                <div className="flex justify-between items-end px-4 mt-auto relative z-10">
                  <div className="flex flex-col items-center w-64">
                    <div className="w-full border-b border-black mb-2"></div>
                    <p className="text-sm font-bold uppercase" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                      Secretário Geral
                    </p>
                  </div>
                  <div className="flex flex-col items-center w-64">
                    <div className="w-full border-b border-black mb-2"></div>
                    <p className="text-sm font-bold uppercase" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                      Pastor da Igreja
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Letters;
