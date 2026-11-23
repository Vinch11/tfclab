import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { THRESHOLD_ORIGIN_OPTIONS, type ThresholdField, type ThresholdOrigin } from "@/lib/zones/thresholdOrigin";

/** D'où vient le seuil saisi : test réalisé, calculateur, montre ou saisie libre. */
export function ThresholdOriginSelect({ field, value, onChange, id }: {
  field: ThresholdField;
  value: ThresholdOrigin | "";
  onChange: (value: ThresholdOrigin) => void;
  id?: string;
}) {
  return (
    <Select value={value || undefined} onValueChange={(v) => onChange(v as ThresholdOrigin)}>
      <SelectTrigger id={id} aria-label={field === "ftp" ? "Provenance de la FTP" : "Provenance de l'allure seuil"}>
        <SelectValue placeholder="D'où vient cette valeur ?" />
      </SelectTrigger>
      <SelectContent>
        {THRESHOLD_ORIGIN_OPTIONS[field].map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
