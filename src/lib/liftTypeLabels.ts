export const LIFT_TYPE_INFO = {
  lift_1: {
    label: "Lift 1",
    description: "from DPC (Minimum 20c)",
    fullLabel: "Lift 1 from DPC (Minimum 20c)"
  },
  lift_2: {
    label: "Lift 2",
    description: "(Joist)",
    fullLabel: "Lift 2 (Joist)"
  },
  lift_3: {
    label: "Lift 3",
    description: "(U/S windows)",
    fullLabel: "Lift 3 (U/S windows)"
  },
  lift_4: {
    label: "Lift 4",
    description: "(Wallplate & Corbells)",
    fullLabel: "Lift 4 (Wallplate & Corbells)"
  },
  lift_5: {
    label: "Lift 5",
    description: "",
    fullLabel: "Lift 5"
  },
  lift_6: {
    label: "Lift 6",
    description: "",
    fullLabel: "Lift 6"
  },
  cut_ups: {
    label: "Cut Ups/Gable",
    description: "",
    fullLabel: "Cut Ups/Gable"
  },
  snag_patch: {
    label: "Snag/Patch Int",
    description: "",
    fullLabel: "Snag/Patch Int"
  },
  snag_patch_int: {
    label: "Snag/Patch Int",
    description: "",
    fullLabel: "Snag/Patch Int"
  },
  snag_patch_ext: {
    label: "Snag/Patch Ext",
    description: "",
    fullLabel: "Snag/Patch Ext"
  },
  dod: {
    label: "D.O.D",
    description: "",
    fullLabel: "D.O.D"
  },
  no_ri: {
    label: "No RI",
    description: "Not Released until CML achieved",
    fullLabel: "No RI"
  },
} as const;

export type LiftType = keyof typeof LIFT_TYPE_INFO;

export const getLiftLabel = (liftType: string): string => {
  return LIFT_TYPE_INFO[liftType as LiftType]?.label || liftType;
};

export const getLiftFullLabel = (liftType: string): string => {
  return LIFT_TYPE_INFO[liftType as LiftType]?.fullLabel || liftType;
};

export const getLiftDescription = (liftType: string): string => {
  return LIFT_TYPE_INFO[liftType as LiftType]?.description || "";
};
