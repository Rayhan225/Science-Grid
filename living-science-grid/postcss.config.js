export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {
      // Only add necessary prefixes
      flexbox: 'no-2009',
      grid: 'autoplace'
    },
    // CSS optimization for production
    ...(process.env.NODE_ENV === 'production' ? {
      cssnano: {
        preset: 'default',
        discardComments: { removeAll: true },
        normalizeWhitespace: true,
        minifyFontValues: { removeQuotes: false },
        minifyGradients: true,
        minifyParams: true,
        minifySelectors: true,
        normalizeDisplayValues: true,
        normalizePositions: true,
        normalizeRepeatStyle: true,
        normalizeString: true,
        normalizeTimingFunctions: true,
        normalizeUnicode: true,
        reduceIdents: false,
        reduceInitial: true,
        reduceTransforms: true,
        svgo: true,
        uniqueSelectors: true
      }
    } : {})
  }
}