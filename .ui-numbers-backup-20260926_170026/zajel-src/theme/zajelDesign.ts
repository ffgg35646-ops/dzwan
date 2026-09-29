export const zajelDesign = {
  colors: {
    background: "#FFFDF8",
    backgroundSoft: "#FFF8EE",
    surface: "#FFFFFF",

    primary: "#FFB25E",
    primaryDark: "#E5501C",
    primaryDeep: "#B4460A",

    dark: "#4A1B0C",
    darkSoft: "#6B2E0E",

    text: "#24150B",
    textSoft: "#8A5A2E",
    textMuted: "#C9A177",

    border: "#F0D9BE",

    success: "#2E9B61",
    danger: "#D94B45",
    warning: "#D98A22",
    info: "#4E87C7",

    white: "#FFFFFF",
  },

  radius: {
    input: 16,
    button: 20,
    card: 20,
    large: 28,
    pill: 999,
  },

  shadows: {
    button: {
      shadowColor: "#B4460A",
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.18,
      shadowRadius: 14,
      elevation: 5,
    },

    card: {
      shadowColor: "#8A5A2E",
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 3,
    },
  },

  layout: {
    pagePadding: 20,
    formMaxWidth: 360,
    inputHeight: 52,
    buttonHeight: 58,
  },

  typography: {
    title: 24,
    section: 18,
    body: 14,
    small: 12,
    tiny: 11,
  },
} as const;
