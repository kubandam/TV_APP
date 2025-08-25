export const FONTS = {
  // Avalon font family
  avalon: {
    thin: 'Avalon-Thin',
    normal: 'Avalon-Normal', 
    italic: 'Avalon-Italic',
    bold: 'Avalon-Bold',
  },
  
  // Font sizes
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  
  // Font weights
  weights: {
    thin: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
} as const;

// Helper function to get font family with weight
export const getFontFamily = (weight: keyof typeof FONTS.avalon = 'normal') => {
  return FONTS.avalon[weight];
};

// Predefined text styles
export const textStyles = {
  // Headings
  h1: {
    fontFamily: FONTS.avalon.bold,
    fontSize: FONTS.sizes['3xl'],
    fontWeight: FONTS.weights.bold,
  },
  h2: {
    fontFamily: FONTS.avalon.bold,
    fontSize: FONTS.sizes['2xl'],
    fontWeight: FONTS.weights.bold,
  },
  h3: {
    fontFamily: FONTS.avalon.normal,
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.medium,
  },
  h4: {
    fontFamily: FONTS.avalon.normal,
    fontSize: FONTS.sizes.base,
    fontWeight: FONTS.weights.normal,
  },
  h5: {
    fontFamily: FONTS.avalon.normal,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.normal,
  },
  
  // Body text
  body: {
    fontFamily: FONTS.avalon.normal,
    fontSize: FONTS.sizes.base,
    fontWeight: FONTS.weights.normal,
  },
  bodyBold: {
    fontFamily: FONTS.avalon.bold,
    fontSize: FONTS.sizes.base,
    fontWeight: FONTS.weights.bold,
  },
  bodyItalic: {
    fontFamily: FONTS.avalon.italic,
    fontSize: FONTS.sizes.base,
    fontWeight: FONTS.weights.normal,
  },
  
  // Buttons
  button: {
    fontFamily: FONTS.avalon.bold,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
  },
  buttonSmall: {
    fontFamily: FONTS.avalon.bold,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
  },
  
  // Captions and small text
  caption: {
    fontFamily: FONTS.avalon.normal,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.normal,
  },
  captionBold: {
    fontFamily: FONTS.avalon.bold,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
  },
  
  // Channel buttons (specific to your app)
  channelButton: {
    fontFamily: FONTS.avalon.bold,
    fontWeight: FONTS.weights.extrabold,
  },
  channelButtonSmall: {
    fontFamily: FONTS.avalon.bold,
    fontWeight: FONTS.weights.bold,
  },
} as const;
