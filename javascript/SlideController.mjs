import Keys from "./Keys.mjs";
import { Selectors, ClassNames } from "./Selectors.mjs";

class SlideController {
  constructor () {
    this.currentSlide = 0;
    this.totalSlides = Infinity;
    this.isFullScreen = SlideController.checkIfFullScreen();
    
    this.container = null;
    this.main = null;
    this.progressBar = null;
    this.slides = null;
    this.slideSelector = null;
    this.slideSelectorInput = null;
    this.defaultTitle = "";
    this.fragment = null;

    // Keys
    this.controlsPressed = [];
    this.nextKeys = [Keys.PgDown, Keys.Down, Keys.Right, Keys.L, Keys.J];
    this.prevKeys = [Keys.PgUp, Keys.Up, Keys.Left, Keys.H, Keys.K];
    this.controlsKeys = [Keys.cmd, Keys.ctrl, Keys.alt, Keys.shift];
    this.selectKeys = [Keys.enter];
    this.exitFullscreenKeys = [Keys.esc];
    this.enterFullscreenKeys = [Keys.enter];
    this.slideSelectorKeys = [Keys.P];


    this.progressBar = document.querySelector(Selectors.progress);
    if (this.progressBar === null) throw new Error("Progress bar not found");
    this.container = document.querySelector(Selectors.container);
    if (this.container === null) throw new Error("Slides container not found");
    this.main = document.querySelector(Selectors.main);
    if (this.main === null) throw new Error("Main container not found");
    this.slides = this.container.querySelectorAll(Selectors.slide);
    if (this.slides === null) throw new Error("No slides found");
    this.slideSelector = document.querySelector(Selectors.slideSelector);
    if (this.slideSelector === null) throw new Error("Can't find page control form");
    this.slideSelectorInput = document.querySelector(Selectors.slideSelectorInput);
    if (this.slideSelectorInput === null) throw new Error("Can't find input in page control form");

    // Transform NodeList to Array
    this.slides = [...this.slides];
    this.defaultTitle = document.title?.textContent || "";
    this.totalSlides = this.slides.length;

    this.slides.forEach((slide, index) => {
      slide.setAttribute('data-number', index + 1);
      slide.setAttribute('tabindex', 0);
    });

    const url = new URL(window.location.href);
    
    // Get current slide from hash
    const hash = url.hash.replace("#slide-", "").trim();
    if (hash.length > 0) {
      this.slideFromString(hash);
    }
    const slideFromQuery = url.searchParams.get('page');
    if (slideFromQuery !== null) {
      this.slideFromString(slideFromQuery);
    }

    for (const name of Object.getOwnPropertyNames(Object.getPrototypeOf(this))) {
      const method = this[name];
      if (name !== 'constructor' && typeof method === 'function') {
        this[name] = method.bind(this);
      }
    }

    // const html = document.querySelectorAll(Selectors.htmlForCleanup);
    // if (html !== null) {
    //   [...html].forEach(element => {
    //     element.innerHTML = SlideController.sanitize(element.innerHTML);
    //   })
    // }

    const code = document.querySelectorAll(Selectors.codeForResize);
    if (code !== null) {
      [...code].forEach(element => {
        element.style.setProperty('--code', `${element.dataset.code}px`);
      })
    }

    document.addEventListener('click', this.clickController);
    document.addEventListener('dblclick', this.dblClickController);
    document.addEventListener('keydown', this.keyDownController);
    document.addEventListener('keyup', this.keyUpController);
    this.slideSelector.addEventListener('submit', this.slideSelectorSubmit);
    
    document.addEventListener('slidecontroller:fullscreenchange', this.fullScreenChange);
    document.addEventListener('slidecontroller:change', this.updateProgress);
    document.addEventListener('slidecontroller:next', this.next);
    document.addEventListener('slidecontroller:prev', this.prev);
    document.addEventListener('slidecontroller:select', this.selectSlide);

    // update progress component
    if (this.isFullScreen) this.updateProgress();

    // calculate scale and update it on window resize
    this.calculateScale();
    const resizeObserver = new ResizeObserver(this.calculateScale);
    resizeObserver.observe(window.document.body);

    // select current slide
    this.markCurrent(this.slides[this.currentSlide]);
    
    // remove page from querie
    if (slideFromQuery !== null) {
      const url = new URL(window.location.href);
      url.searchParams.delete("page");
      history.pushState({}, `Slide ${this.currentSlide + 1} | ${this.defaultTitle}`, url.href);
    }
  }

  slideFromString (slide) {
    this.currentSlide = parseInt(slide) - 1;
    if (Number.isNaN(this.currentSlide)) this.currentSlide = 0;
    if (this.currentSlide < 0) this.currentSlide = 0;
    if (this.currentSlide >= this.totalSlides) this.currentSlide = this.totalSlides - 1;
  }

  scrollToCurrent (animated = false) {
    const endPos = this.slides[this.currentSlide].offsetTop - 20;
    window.scroll({
      top: endPos,
      left: 0,
      behavior: animated ? 'smooth' : 'auto',
    });
  }

  calculateScale () {
    const scale = 1/Math.max(
      this.slides[this.currentSlide].clientWidth/window.innerWidth, 
      this.slides[this.currentSlide].clientHeight/window.innerHeight
    );
    document.documentElement.style.setProperty('--scale', scale);
  }

  static checkIfFullScreen () {
    return window.document.documentElement.classList.contains(ClassNames.fullscreen);
  }

  static toggleFullscreen (force) {
    const fullscreenStateOld = SlideController.checkIfFullScreen();
    window.document.documentElement.classList.toggle(ClassNames.fullscreen, force);
    const fullscreenStateNew = SlideController.checkIfFullScreen();
    if (fullscreenStateOld !== fullscreenStateNew) {
      const event = new CustomEvent("slidecontroller:fullscreenchange");
      window.document.dispatchEvent(event);
    }
  }

  next () {
    const element = this.getNextSlide();
    this.markCurrent(element);
  }

  prev () {
    const element = this.getPrevSlide();
    this.markCurrent(element);
  }

  selectSlide (event) {
    const element = event.target;
    this.markCurrent(element);
  }

  slideSelectorSubmit (event) {
    event.preventDefault();
    const form = event.currentTarget;
    let slideNumber = parseInt(this.slideSelectorInput.value);
    if (slideNumber < 1) slideNumber = 1;
    if (slideNumber > this.totalSlides) slideNumber = this.totalSlides;
    const element = this.slides[slideNumber - 1];
    this.markCurrent(element);
    this.toggleSlideSelector();
    form.reset();
  }

  dblClickController (event) {
    if (this.isFullScreen) return;
    const element = event.target;
    let sliderEvent;

    // DblClick on slide
    if (element.classList.contains(ClassNames.slide)) {
      sliderEvent = new CustomEvent("slidecontroller:select", {bubbles: true});
      SlideController.toggleFullscreen(true);
    }
    if (sliderEvent) element.dispatchEvent(sliderEvent);
  }

  clickController (event) {
    if (this.isFullScreen) return;
    const element = event.target;
    let sliderEvent;
    // Click on slide
    if (element.classList.contains(ClassNames.slide)) {
      sliderEvent = new CustomEvent("slidecontroller:select", {bubbles: true});
    }
    if (sliderEvent) element.dispatchEvent(sliderEvent);
  }

  keyUpController (event) {
    const index = this.controlsPressed.indexOf(event.which);
    if (index > -1) {
      this.controlsPressed.splice(index, 1);
    }
  }

  keyDownController (event) {
    const element = event.target;

    // Control keys
    if (this.controlsKeys.includes(event.which) && !this.controlsPressed.includes(event.which)) {
      this.controlsPressed.push(event.which);
      return;
    }

    // Show slide selection form
    if (this.slideSelectorKeys.includes(event.which)) {
      event.preventDefault();
      this.toggleSlideSelector();
    }

    // Select next slide
    if (this.nextKeys.includes(event.which)) {
      event.preventDefault();
      const sliderEvent = new CustomEvent("slidecontroller:next");
      document.dispatchEvent(sliderEvent);
    }

    // Select previous slide
    if (this.prevKeys.includes(event.which)) {
      event.preventDefault();
      const sliderEvent = new CustomEvent("slidecontroller:prev");
      document.dispatchEvent(sliderEvent);
    }

    // Select focused slide
    if (this.selectKeys.includes(event.which) && (element.classList.contains(ClassNames.slide))) {
      const sliderEvent = new CustomEvent("slidecontroller:select", {bubbles: true});
      element.dispatchEvent(sliderEvent);
    }

    // Esc to exit fullscreen
    if (this.exitFullscreenKeys.includes(event.which)) {
      if (this.slideSelector.classList.contains(ClassNames.slideSelectorVisibility)) {
        this.toggleSlideSelector();
      } else if (this.isFullScreen) {
        SlideController.toggleFullscreen(false);
      }
    }

    // Enter to switch fullscreen
    if (this.enterFullscreenKeys.includes(event.which)) {
      if (event.target.classList.contains(ClassNames.slide)) {
        SlideController.toggleFullscreen();
      }
    }
  }

  toggleSlideSelector () {
    this.slideSelector.classList.toggle(ClassNames.slideSelectorVisibility);
    if (this.slideSelector.classList.contains(ClassNames.slideSelectorVisibility)) this.slideSelectorInput.focus();
  }

  getPrevSlide () {
    return this.slides[this.currentSlide - 1] === undefined 
      ? this.slides[this.totalSlides - 1] 
      : this.slides[this.currentSlide - 1];
  }

  getNextSlide () {
    return this.slides[this.currentSlide + 1] === undefined 
      ? this.slides[0] 
      : this.slides[this.currentSlide + 1];
  }

  markCurrent (element) {
    const prevSlide = this.getPrevSlide();
    const nextSlide = this.getNextSlide();
    prevSlide.classList.toggle(ClassNames.prevSlide, false); 
    nextSlide.classList.toggle(ClassNames.nextSlide, false);

    this.slides[this.currentSlide].classList.toggle(ClassNames.currentSlide, false);

    this.slides.find((slide, index) => {
      if (slide === element) {
        this.currentSlide = index;
        element.focus();
        slide.classList.toggle(ClassNames.currentSlide, true);

        const prevSlide = this.getPrevSlide();
        const nextSlide = this.getNextSlide();
        prevSlide.classList.toggle(ClassNames.prevSlide, true); 
        nextSlide.classList.toggle(ClassNames.nextSlide, true);
        
        history.pushState({}, `Slide ${index + 1} | ${this.defaultTitle}`, `#slide-${index + 1}`);
        if (this.isFullScreen) {
          const event = new CustomEvent("slidecontroller:change");
          window.document.dispatchEvent(event);
        } else {
          this.scrollToCurrent();
        }
      }
      return slide === element;
    });
  }

  fullScreenChange () {
    this.isFullScreen = SlideController.checkIfFullScreen();
    if (!this.isFullScreen) this.scrollToCurrent(false);
  }

  updateProgress () {
    this.progressBar.setAttribute("max", this.totalSlides);
    this.progressBar.setAttribute("value", this.currentSlide + 1);
    this.progressBar.innerHTML = `${this.currentSlide + 1}/${this.totalSlides}`;
  }
}

new SlideController();