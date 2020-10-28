const Selectors = {
  progress: "#progress",
  slide: ".slide",
  firstSlide: ".slide:first-of-type",
  endSlide: ".slide:last-of-type",
  prevSlide: ".prev",
  currentSlide: ".current",
  nextSlide: ".next",
  allSlidesAfterSlides: ".current ~ .slide",
  container: ".slides",
  title: "title",
  main: "main",
  slideSelector: ".slide-selector",
  slideSelectorInput: ".slide-selector input",
  codeForResize: "[data-code]",
  htmlForCleanup: "[data-html]",
};

const ClassNames = {
  prevSlide: "prev",
  currentSlide: "current",
  nextSlide: "next",
  slide: "slide",
  fullscreen: "fullscreen",
  slideSelector: "slide-selector",
  slideSelectorVisibility: "visible",
};

export { ClassNames, Selectors };