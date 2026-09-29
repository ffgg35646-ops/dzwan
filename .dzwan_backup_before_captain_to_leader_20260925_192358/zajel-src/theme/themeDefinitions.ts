export type AppTheme = {
  id: string;
  name: string;
  description?: string;

  primaryColor: string;
  primaryDarkColor: string;
  secondaryColor: string;

  backgroundColor: string;
  surfaceColor: string;
  cardColor: string;

  textColor: string;
  secondaryTextColor: string;

  borderColor: string;

  successColor: string;
  dangerColor: string;
  warningColor: string;
  infoColor: string;

  headerStyle?: string;
  cardStyle?: string;
  buttonStyle?: string;
  inputStyle?: string;
  shadowStyle?: string;
  fontStyle?: string;
};

export const DEFAULT_THEME: AppTheme = {
  id: "zajel-premium",
  name: "زاجل",
  description: "هوية زاجل الموحدة",

  primaryColor: "#FFB25E",
  primaryDarkColor: "#E5501C",
  secondaryColor: "#FF8A3D",

  backgroundColor: "#FFFDF8",
  surfaceColor: "#FFFFFF",
  cardColor: "#FFFFFF",

  textColor: "#24150B",
  secondaryTextColor: "#8A5A2E",

  borderColor: "#F0D9BE",

  successColor: "#2E9B61",
  dangerColor: "#D94B45",
  warningColor: "#D98A22",
  infoColor: "#4E87C7",

  headerStyle: "premium-zajel",
  cardStyle: "soft",
  buttonStyle: "zajel-rounded",
  inputStyle: "zajel-soft",
  shadowStyle: "soft-warm",
  fontStyle: "modern",
};
