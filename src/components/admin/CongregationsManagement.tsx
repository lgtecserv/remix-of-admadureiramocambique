import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Plus, Power, Edit2 } from "lucide-react";

interface Congregation {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  active: boolean;
  pastor_responsavel_id: string | null;
}

interface Props {
  onChange?: () => void;
}

export function CongregationsManagement({ onChange }: Props) {
  const [list, setList] = useState<Congregation[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // State for creation
  const [form, setForm] = useState({ name: "", city: "", address: "", phone: "" });
  
  // State for editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", city: "", address: "", phone: "" });

  const load = async () => {
    const { data } = await supabase
      .from("congregations")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setList(data as Congregation[]);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("congregations").insert({
      name: form.name.trim(),
      city: form.city.trim() || null,
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      active: true,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Congregação criada!");
    setForm({ name: "", city: "", address: "", phone: "" });
    setOpen(false);
    load();
    onChange?.();
  };

  const openEditDialog = (c: Congregation) => {
    setEditingId(c.id);
    setEditForm({
      name: c.name || "",
      city: c.city || "",
      address: c.address || "",
      phone: c.phone || "",
    });
    setEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    if (!editForm.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("congregations").update({
      name: editForm.name.trim(),
      city: editForm.city.trim() || null,
      address: editForm.address.trim() || null,
      phone: editForm.phone.trim() || null,
    }).eq("id", editingId);
    
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Congregação atualizada!");
    setEditOpen(false);
    load();
    onChange?.();
  };

  const toggleActive = async (c: Congregation) => {
    const { error } = await supabase
      .from("congregations")
      .update({ active: !c.active })
      .eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success(c.active ? "Desativada" : "Ativada");
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Congregações
          </CardTitle>
          <CardDescription>Cadastre e gerencie as congregações</CardDescription>
        </div>
        
        {/* Create Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova</Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Congregação</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <Label htmlFor="cong-name">Nome *</Label>
                <Input id="cong-name" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={120} />
              </div>
              <div>
                <Label htmlFor="cong-city">Cidade</Label>
                <Input id="cong-city" value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={80} />
              </div>
              <div>
                <Label htmlFor="cong-addr">Endereço</Label>
                <Input id="cong-addr" value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={200} />
              </div>
              <div>
                <Label htmlFor="cong-phone">Telefone</Label>
                <Input id="cong-phone" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={30} />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Salvando..." : "Criar Congregação"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Congregação</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <Label htmlFor="edit-cong-name">Nome *</Label>
                <Input id="edit-cong-name" value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required maxLength={120} />
              </div>
              <div>
                <Label htmlFor="edit-cong-city">Cidade</Label>
                <Input id="edit-cong-city" value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} maxLength={80} />
              </div>
              <div>
                <Label htmlFor="edit-cong-addr">Endereço</Label>
                <Input id="edit-cong-addr" value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} maxLength={200} />
              </div>
              <div>
                <Label htmlFor="edit-cong-phone">Telefone</Label>
                <Input id="edit-cong-phone" value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} maxLength={30} />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma congregação cadastrada.
          </p>
        ) : (
          <div className="space-y-2">
            {list.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 p-3 rounded-md border bg-card">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{c.name}</p>
                    <Badge variant={c.active ? "default" : "outline"} className="text-xs">
                      {c.active ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                  {(c.city || c.phone) && (
                    <p className="text-xs text-muted-foreground truncate">
                      {[c.city, c.phone].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="icon" variant="outline" className="h-8 w-8"
                    onClick={() => openEditDialog(c)} title="Editar">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline" className="h-8 w-8"
                    onClick={() => toggleActive(c)} title={c.active ? "Desativar" : "Ativar"}>
                    <Power className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
