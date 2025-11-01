import garageSingleIcon from "@/assets/garage-single.png";
import garageDoubleIcon from "@/assets/garage-double.png";

export const GARAGE_TYPES = [
  { value: "single", label: "Single Garage", icon: garageSingleIcon },
  { value: "double", label: "Double Garage", icon: garageDoubleIcon },
] as const;

export const GARAGE_LIFT_TYPES = {
  lift_1: "Lift 1",
  lift_2: "Lift 2",
  cut_ups: "Cut-Ups",
  snag_patch_int: "Snag/Patch Int",
  snag_patch_ext: "Snag/Patch Ext",
} as const;

export type GarageType = typeof GARAGE_TYPES[number]["value"];

export const getGarageLabel = (type: string): string => {
  const garage = GARAGE_TYPES.find((g) => g.value === type);
  return garage ? garage.label : type;
};

export const getGarageIcon = (type: string): string => {
  const garage = GARAGE_TYPES.find((g) => g.value === type);
  return garage ? garage.icon : garageSingleIcon;
};
