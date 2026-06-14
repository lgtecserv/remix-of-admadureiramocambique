import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import MemberPhotoUpload from "./MemberPhotoUpload";

interface AdditionalMemberFieldsProps {
  formData: {
    address: string;
    birthDate: string;
    maritalStatus: string;
    occupation: string;
    baptismDate: string;
    observations: string;
    gender: string;
    memberType: string;
    photoUrl: string;
    churchFunction: string;
    churchOffice: string;
  };
  setFormData: (data: any) => void;
  memberName?: string;
}

const getMemberTypes = (gender?: string) => {
  const isFemale = gender === "feminino";
  return [
    { value: "congregado", label: isFemale ? "Congregada" : "Congregado" },
    { value: "membro", label: "Membro da Igreja" },
  ];
};

const getChurchOffices = (gender?: string) => {
  const isFemale = gender === "feminino";
  return [
    { value: "cooperador", label: isFemale ? "Cooperadora" : "Cooperador" },
    { value: "diacono", label: isFemale ? "Diaconisa" : "Diácono" },
    { value: "presbitero", label: isFemale ? "Presbítera" : "Presbítero" },
    { value: "pastor", label: isFemale ? "Pastora" : "Pastor" },
    { value: "evangelista", label: "Evangelista" },
    { value: "missionario", label: isFemale ? "Missionária" : "Missionário" },
  ];
};

const getMaritalStatuses = (gender?: string) => {
  const isFemale = gender === "feminino";
  return [
    { value: "solteiro", label: isFemale ? "Solteira" : "Solteiro" },
    { value: "casado", label: isFemale ? "Casada" : "Casado" },
    { value: "divorciado", label: isFemale ? "Divorciada" : "Divorciado" },
    { value: "viuvo", label: isFemale ? "Viúva" : "Viúvo" },
  ];
};

const AdditionalMemberFields = ({ formData, setFormData, memberName }: AdditionalMemberFieldsProps) => {
  return (
    <>
      {/* Foto do Membro */}
      <MemberPhotoUpload
        photoUrl={formData.photoUrl}
        onPhotoChange={(url) => setFormData({ ...formData, photoUrl: url })}
        memberName={memberName || "Membro"}
      />

      {/* Sexo e Tipo de Membro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="gender">Sexo</Label>
          <Select
            value={formData.gender}
            onValueChange={(value) => setFormData({ ...formData, gender: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="masculino">Masculino</SelectItem>
              <SelectItem value="feminino">Feminino</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="memberType">Tipo de Membro</Label>
          <Select
            value={formData.memberType}
            onValueChange={(value) => setFormData({ ...formData, memberType: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {getMemberTypes(formData.gender).map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="churchOffice">Cargo na Igreja</Label>
          <Select
            value={formData.churchOffice}
            onValueChange={(value) => setFormData({ ...formData, churchOffice: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {getChurchOffices(formData.gender).map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="churchFunction">Função na Igreja</Label>
          <Input
            id="churchFunction"
            type="text"
            value={formData.churchFunction}
            onChange={(e) => setFormData({ ...formData, churchFunction: e.target.value })}
            maxLength={120}
            placeholder="Ex: dirigente de louvor"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Endereço</Label>
        <Input
          id="address"
          type="text"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          maxLength={200}
          placeholder="Rua, número, bairro..."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="birthDate">Data de Nascimento</Label>
          <Input
            id="birthDate"
            type="date"
            value={formData.birthDate}
            onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maritalStatus">Estado Civil</Label>
          <Select
            value={formData.maritalStatus}
            onValueChange={(value) => setFormData({ ...formData, maritalStatus: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {getMaritalStatuses(formData.gender).map((status) => (
                <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="occupation">Profissão</Label>
          <Input
            id="occupation"
            type="text"
            value={formData.occupation}
            onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
            maxLength={100}
            placeholder="Sua profissão..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="baptismDate">Data de Batismo</Label>
          <Input
            id="baptismDate"
            type="date"
            value={formData.baptismDate}
            onChange={(e) => setFormData({ ...formData, baptismDate: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observations">Observações</Label>
        <Textarea
          id="observations"
          value={formData.observations}
          onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
          maxLength={500}
          placeholder="Observações adicionais..."
          rows={3}
        />
      </div>
    </>
  );
};

export default AdditionalMemberFields;
