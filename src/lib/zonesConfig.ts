// Configuration des zones d'entraînement - Modèle Vince's Lab

export interface ZoneDefinition {
  key: string;
  name: string;
  min: number;
  max: number;
  cogH?: number;
  desc: string;
}

export interface MetricConfig {
  label: string;
  sports: Record<string, ZoneDefinition[]>;
}

export const ZonesConfig: Record<string, MetricConfig> = {
  allure: {
    label: "Allure",
    sports: {
      "course": [
        { key: "Z1", name: "Récupération active", min: 55, max: 65, desc: "Récupération active, élimination du lactate, faible stress cardio-musculaire, amélioration technique. Durée type: 30-90min" },
        { key: "Z2", name: "Endurance Fondamentale", min: 65, max: 75, desc: "Développement aérobie, augmentation des mitochondries, métabolisme lipidique, amélioration de l'économie gestuelle." },
        { key: "Z3", name: "Endurance Active", min: 75, max: 80, desc: "Amélioration de l'économie, hausse du seuil ventilatoire, stabilité technique à intensité soutenue." },
        { key: "Z4a", name: "ASL+2 Seuil bas", min: 80, max: 86, desc: "Endurance musculaire, utilisation énergétique optimisée, capacité à soutenir de longues intensités proches du seuil." },
        { key: "Z4b", name: "AS21 Seuil haut", min: 86, max: 90, desc: "Augmentation du seuil lactique, endurance à haute intensité, tolérance métabolique." },
        { key: "Z5", name: "Seuil", min: 90, max: 94, desc: "Repousse du seuil anaérobie, forte tolérance lactate, amélioration des performances sur 10 km." },
        { key: "Z6", name: "Anaérobie lactique", min: 94, max: 105, desc: "Augmentation du VO2max, capacité aérobie maximale, vitesse critique et puissance maximale." },
        { key: "Z7", name: "Neuromusculaire", min: 105, max: 120, desc: "Capacité anaérobie lactique, explosivité, puissance maximale, coordination neuromusculaire (sprint)." }
      ],
      "natation": [
        { key: "Z1", name: "Récupération active", min: 0, max: 85, desc: "Récupération active, élimination du lactate, faible stress cardio-musculaire, amélioration technique. Durée type: 30-90min" },
        { key: "Z2", name: "Endurance Fondamentale", min: 85, max: 95, desc: "Développement aérobie, augmentation des mitochondries, métabolisme lipidique, amélioration de l'économie gestuelle." },
        { key: "Z3", name: "Endurance Active", min: 95, max: 100, desc: "Amélioration de l'économie, hausse du seuil ventilatoire, stabilité technique à intensité soutenue." },
        { key: "Z4a", name: "ASL+2 Seuil bas", min: 100, max: 105, desc: "Endurance musculaire, utilisation énergétique optimisée, capacité à soutenir intensités proches du seuil." },
        { key: "Z4b", name: "AS21 Seuil haut", min: 105, max: 110, desc: "Augmentation du seuil lactique, endurance à haute intensité, tolérance métabolique." },
        { key: "Z5", name: "Seuil", min: 110, max: 115, desc: "Repousse du seuil anaérobie, forte tolérance lactate." },
        { key: "Z6", name: "Anaérobie lactique", min: 115, max: 120, desc: "Augmentation du VO2max, capacité aérobie maximale." },
        { key: "Z7", name: "Neuromusculaire", min: 120, max: 150, desc: "Capacité anaérobie lactique, explosivité, coordination neuromusculaire (sprint)." }
      ]
    }
  },

  puissance: {
    label: "Puissance",
    sports: {
      "course": [
        { key: "Z1", name: "Récupération active", min: 0, max: 80, desc: "Récupération active, circulation, élimination du lactate. Durée typique: 30-90 min" },
        { key: "Z2", name: "Endurance Fondamentale", min: 80, max: 90, desc: "Aérobie de base, endurance fondamentale, économie énergétique. Durée typique: 1 à 5 h" },
        { key: "Z3", name: "Endurance Active", min: 90, max: 100, desc: "Endurance soutenue, amélioration du seuil aérobie, 'tempo'" },
        { key: "Z4", name: "Seuil", min: 100, max: 115, desc: "Amélioration du FTP, MLSS, tolérance lactique" },
        { key: "Z5", name: "VO2max", min: 115, max: 130, desc: "Développement de la VO2max" }
      ],
      "cyclisme": [
        { key: "Z1", name: "Récupération active", min: 10, max: 55, desc: "Récupération active, circulation, élimination du lactate. Durée typique: 30-90 min" },
        { key: "Z2", name: "Endurance Fondamentale", min: 55, max: 75, desc: "Aérobie de base, endurance fondamentale, économie énergétique. Durée typique: 1 à 5 h" },
        { key: "Z3", name: "Endurance Active", min: 75, max: 90, desc: "Endurance soutenue, amélioration du seuil aérobie, 'tempo'" },
        { key: "Z4", name: "Seuil", min: 90, max: 105, desc: "Amélioration du FTP, MLSS, tolérance lactique" },
        { key: "Z5", name: "VO2max", min: 105, max: 120, desc: "Développement de la VO2max" },
        { key: "Z6", name: "Anaérobie lactique", min: 120, max: 150, desc: "Capacité anaérobie lactique, tolérance acide" },
        { key: "Z7", name: "Neuromusculaire", min: 150, max: 300, desc: "Puissance neuromusculaire, coordination, explosivité" }
      ]
    }
  },

  cardiaque: {
    label: "Cardiaque",
    sports: {
      "tout sport": [
        { key: "Z1", name: "Récupération active", min: 50, max: 68, cogH: 36, desc: "Récupération active, circulation, élimination du lactate." },
        { key: "Z2", name: "Endurance Fondamentale", min: 68, max: 80, cogH: 55, desc: "Aérobie de base, endurance fondamentale, économie énergétique." },
        { key: "Z3", name: "Endurance Active", min: 80, max: 84, cogH: 65, desc: "Endurance soutenue, amélioration du seuil aérobie 'tempo'. Durée typique: 20min – 2h" },
        { key: "Z4a", name: "ASL+2", min: 84, max: 87, cogH: 70, desc: "Endurance musculaire, utilisation énergétique optimisée, capacité à soutenir de longues intensités proches du seuil." },
        { key: "Z4b", name: "AS21", min: 87, max: 90, cogH: 75, desc: "Augmentation du seuil lactique, endurance à haute intensité, tolérance métabolique." },
        { key: "Z4", name: "Seuil", min: 90, max: 92, cogH: 80, desc: "Repousse du seuil anaérobie, forte tolérance lactate, amélioration des performances sur 10 km." },
        { key: "Z5", name: "VO2max - VMA", min: 92, max: 97, cogH: 120, desc: "Augmentation du VO2max, capacité aérobie maximale, vitesse critique et puissance maximale." },
        { key: "Z6", name: "Anaérobie Lactique", min: 97, max: 100, cogH: 150, desc: "Capacité anaérobie lactique, explosivité, puissance maximale, coordination neuromusculaire (sprint). Durée typique: 20 s – 2 min" }
      ]
    }
  }
};

export function getZoneTable(metricKey: string, sportKey: string): ZoneDefinition[] {
  const metric = ZonesConfig[metricKey];
  if (!metric) return [];
  return metric.sports[sportKey] || [];
}

export function getZoneTarget(
  metricKey: string,
  sportKey: string,
  zoneKey: string,
  referenceValue: number,
  unit: string = ""
) {
  const zones = getZoneTable(metricKey, sportKey);
  const z = zones.find(x => x.key === zoneKey);
  if (!z || referenceValue == null) return null;
  
  const lo = (z.min / 100) * referenceValue;
  const hi = (z.max / 100) * referenceValue;
  
  return {
    zoneKey: z.key,
    name: z.name,
    absMin: lo,
    absMax: hi,
    unit,
    percentMin: z.min,
    percentMax: z.max
  };
}

export function detectZone(
  metricKey: string,
  sportKey: string,
  valueAbs: number,
  referenceValue: number
): ZoneDefinition | null {
  const zones = getZoneTable(metricKey, sportKey);
  if (!zones.length || !referenceValue) return null;
  const pct = (valueAbs / referenceValue) * 100;
  return zones.find(z => pct >= z.min && pct <= z.max) || null;
}

export const zoneColors: Record<string, { text: string; bg: string; border: string }> = {
  Z1: { text: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30" },
  Z2: { text: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/30" },
  Z3: { text: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30" },
  Z4: { text: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/30" },
  Z4a: { text: "text-orange-300", bg: "bg-orange-300/10", border: "border-orange-300/30" },
  Z4b: { text: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  Z5: { text: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/30" },
  Z6: { text: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/30" },
  Z7: { text: "text-pink-400", bg: "bg-pink-400/10", border: "border-pink-400/30" },
};
