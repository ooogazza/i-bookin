export const GARAGE_TYPES = [
  { value: "single", label: "Single Garage", icon: "🚗" },
  { value: "double", label: "Double Garage", icon: "🚙🚗" },
  { value: "tandem", label: "Tandem Garage", icon: "🚗➡️🚗" },
  { value: "block", label: "Garage Block", icon: "🏢" },
  { value: "carport", label: "Carport", icon: "⛱️" },
] as const;

export type GarageType = typeof GARAGE_TYPES[number]["value"];

export const getGarageLabel = (type: string): string => {
  const garage = GARAGE_TYPES.find((g) => g.value === type);
  return garage ? garage.label : type;
};

export const getGarageIcon = (type: string): string => {
  const garage = GARAGE_TYPES.find((g) => g.value === type);
  return garage ? garage.icon : "🚗";
};
