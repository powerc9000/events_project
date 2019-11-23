module.exports = {
  variants: {
    backgroundColor: ["hover", "focus", "open"],
    borderWidth: ["responsive", "open"]
  },
  plugins: [
    function({ addVariant, e }) {
      addVariant("open", ({ modifySelectors, separator }) => {
        modifySelectors(({ className }) => {
          return `.${e(
            `open${separator}${className}`
          )}[open], details[open] .${e(`open${separator}${className}`)}`;
        });
      });
    }
  ]
};
