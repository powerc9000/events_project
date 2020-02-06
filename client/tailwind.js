module.exports = {
  variants: {
    backgroundColor: ["responsive", "hover", "focus", "open"],
    borderWidth: ["responsive", "open"],
    textColor: ["responsive", "hover", "focus", "open"]
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
