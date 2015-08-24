/**
 * Parallax.js
 * @author Matthew Wagerfield - @wagerfield
 * @description Creates a parallax effect between an array of layers,
 *              driving the motion from the gyroscope output of a smartdevice.
 *              If no gyroscope is available, the cursor position is used.
 */
;(function(window, document, undefined) {

  // Strict Mode
  'use strict';

  // Constants
  var NAME = 'Parallax';
  var MAGIC_NUMBER = 30;
  var DEFAULTS = {
    relativeInput: false,
    clipRelativeInput: false,
    calibrationThreshold: 100,
    calibrationDelay: 500,
    supportDelay: 500,
    calibrateX: false,
    calibrateY: true,
    invertX: true,
    invertY: true,
    limitX: false,
    limitY: false,
    scalarX: 10.0,
    scalarY: 10.0,
    frictionX: 0.1,
    frictionY: 0.1,
    originX: 0.5,
    originY: 0.5
  };

  function Parallax(element, options) {

    // DOM Context
    this.element = element;
    this.layers = element.getElementsByClassName('layer');

    // Data Extraction
    var data = {
      calibrateX: this.data(this.element, 'calibrate-x'),
      calibrateY: this.data(this.element, 'calibrate-y'),
      invertX: this.data(this.element, 'invert-x'),
      invertY: this.data(this.element, 'invert-y'),
      limitX: this.data(this.element, 'limit-x'),
      limitY: this.data(this.element, 'limit-y'),
      scalarX: this.data(this.element, 'scalar-x'),
      scalarY: this.data(this.element, 'scalar-y'),
      frictionX: this.data(this.element, 'friction-x'),
      frictionY: this.data(this.element, 'friction-y'),
      originX: this.data(this.element, 'origin-x'),
      originY: this.data(this.element, 'origin-y')
    };

    // Delete Null Data Values
    for (var key in data) {
      if (data[key] === null) delete data[key];
    }

    // Compose Settings Object
    this.extend(this, DEFAULTS, options, data);

    // States
    this.calibrationTimer = null;
    this.calibrationFlag = true;
    this.enabled = false;
    this.depths = [];
    this.raf = null;

    // Element Bounds
    this.bounds = null;
    this.ex = 0;
    this.ey = 0;
    this.ew = 0;
    this.eh = 0;

    // Element Center
    this.ecx = 0;
    this.ecy = 0;

    // Element Range
    this.erx = 0;
    this.ery = 0;

    // Calibration
    this.cx = 0;
    this.cy = 0;

    // Input
    this.ix = 0;
    this.iy = 0;

    // Motion
    this.mx = 0;
    this.my = 0;

    // Velocity
    this.vx = 0;
    this.vy = 0;

    // Callbacks
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onDeviceOrientation = this.onDeviceOrientation.bind(this);
    this.onOrientationTimer = this.onOrientationTimer.bind(this);
    this.onCalibrationTimer = this.onCalibrationTimer.bind(this);
    this.onAnimationFrame = this.onAnimationFrame.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);

    // Initialise
    this.initialise();
  }

  Parallax.prototype.extend = function() {
    if (arguments.length > 1) {
      var master = arguments[0];
      for (var i = 1, l = arguments.length; i < l; i++) {
        var object = arguments[i];
        for (var key in object) {
          master[key] = object[key];
        }
      }
    }
  };

  Parallax.prototype.data = function(element, name) {
    return this.deserialize(element.getAttribute('data-'+name));
  };

  Parallax.prototype.deserialize = function(value) {
    if (value === "true") {
      return true;
    } else if (value === "false") {
      return false;
    } else if (value === "null") {
      return null;
    } else if (!isNaN(parseFloat(value)) && isFinite(value)) {
      return parseFloat(value);
    } else {
      return value;
    }
  };

  Parallax.prototype.camelCase = function(value) {
    return value.replace(/-+(.)?/g, function(match, character){
      return character ? character.toUpperCase() : '';
    });
  };

  Parallax.prototype.transformSupport = function(value) {
    var element = document.createElement('div');
    var propertySupport = false;
    var propertyValue = null;
    var featureSupport = false;
    var cssProperty = null;
    var jsProperty = null;
    for (var i = 0, l = this.vendors.length; i < l; i++) {
      if (this.vendors[i] !== null) {
        cssProperty = this.vendors[i][0] + 'transform';
        jsProperty = this.vendors[i][1] + 'Transform';
      } else {
        cssProperty = 'transform';
        jsProperty = 'transform';
      }
      if (element.style[jsProperty] !== undefined) {
        propertySupport = true;
        break;
      }
    }
    switch(value) {
      case '2D':
        featureSupport = propertySupport;
        break;
      case '3D':
        if (propertySupport) {
          var body = document.body || document.createElement('body');
          var documentElement = document.documentElement;
          var documentOverflow = documentElement.style.overflow;
          if (!document.body) {
            documentElement.style.overflow = 'hidden';
            documentElement.appendChild(body);
            body.style.overflow = 'hidden';
            body.style.background = '';
          }
          body.appendChild(element);
          element.style[jsProperty] = 'translate3d(1px,1px,1px)';
          propertyValue = window.getComputedStyle(element).getPropertyValue(cssProperty);
          featureSupport = propertyValue !== undefined && propertyValue.length > 0 && propertyValue !== "none";
          documentElement.style.overflow = documentOverflow;
          body.removeChild(element);
        }
        break;
    }
    return featureSupport;
  };

  Parallax.prototype.ww = null;
  Parallax.prototype.wh = null;
  Parallax.prototype.wcx = null;
  Parallax.prototype.wcy = null;
  Parallax.prototype.wrx = null;
  Parallax.prototype.wry = null;
  Parallax.prototype.portrait = null;
  Parallax.prototype.desktop = !navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|BB10|mobi|tablet|opera mini|nexus 7)/i);
  Parallax.prototype.vendors = [null,['-webkit-','webkit'],['-moz-','Moz'],['-o-','O'],['-ms-','ms']];
  Parallax.prototype.motionSupport = !!window.DeviceMotionEvent;
  Parallax.prototype.orientationSupport = !!window.DeviceOrientationEvent;
  Parallax.prototype.orientationStatus = 0;
  Parallax.prototype.transform2DSupport = Parallax.prototype.transformSupport('2D');
  Parallax.prototype.transform3DSupport = Parallax.prototype.transformSupport('3D');
  Parallax.prototype.propertyCache = {};

  Parallax.prototype.initialise = function() {

    // Configure Context Styles
    if (this.transform3DSupport) this.accelerate(this.element);
    var style = window.getComputedStyle(this.element);
    if (style.getPropertyValue('position') === 'static') {
      this.element.style.position = 'relative';
    }

    // Setup
    this.updateLayers();
    this.updateDimensions();
    this.enable();
    this.queueCalibration(this.calibrationDelay);
  };

  Parallax.prototype.updateLayers = function() {

    // Cache Layer Elements
    this.layers = this.element.getElementsByClassName('layer');
    this.depths = [];

    // Configure Layer Styles
    for (var i = 0, l = this.layers.length; i < l; i++) {
      var layer = this.layers[i];
      if (this.transform3DSupport) this.accelerate(layer);
      layer.style.position = i ? 'absolute' : 'relative';
      layer.style.display = 'block';
      layer.style.left = 0;
      layer.style.top = 0;

      // Cache Layer Depth
      this.depths.push(this.data(layer, 'depth') || 0);
    }
  };

  Parallax.prototype.updateDimensions = function() {
    this.ww = window.innerWidth;
    this.wh = window.innerHeight;
    this.wcx = this.ww * this.originX;
    this.wcy = this.wh * this.originY;
    this.wrx = Math.max(this.wcx, this.ww - this.wcx);
    this.wry = Math.max(this.wcy, this.wh - this.wcy);
  };

  Parallax.prototype.updateBounds = function() {
    this.bounds = this.element.getBoundingClientRect();
    this.ex = this.bounds.left;
    this.ey = this.bounds.top;
    this.ew = this.bounds.width;
    this.eh = this.bounds.height;
    this.ecx = this.ew * this.originX;
    this.ecy = this.eh * this.originY;
    this.erx = Math.max(this.ecx, this.ew - this.ecx);
    this.ery = Math.max(this.ecy, this.eh - this.ecy);
  };

  Parallax.prototype.queueCalibration = function(delay) {
    clearTimeout(this.calibrationTimer);
    this.calibrationTimer = setTimeout(this.onCalibrationTimer, delay);
  };

  Parallax.prototype.enable = function() {
    if (!this.enabled) {
      this.enabled = true;
      if (this.orientationSupport) {
        this.portrait = null;
        window.addEventListener('deviceorientation', this.onDeviceOrientation);
        setTimeout(this.onOrientationTimer, this.supportDelay);
      } else {
        this.cx = 0;
        this.cy = 0;
        this.portrait = false;
        window.addEventListener('mousemove', this.onMouseMove);
      }
      window.addEventListener('resize', this.onWindowResize);
      this.raf = requestAnimationFrame(this.onAnimationFrame);
    }
  };

  Parallax.prototype.disable = function() {
    if (this.enabled) {
      this.enabled = false;
      if (this.orientationSupport) {
        window.removeEventListener('deviceorientation', this.onDeviceOrientation);
      } else {
        window.removeEventListener('mousemove', this.onMouseMove);
      }
      window.removeEventListener('resize', this.onWindowResize);
      cancelAnimationFrame(this.raf);
    }
  };

  Parallax.prototype.calibrate = function(x, y) {
    this.calibrateX = x === undefined ? this.calibrateX : x;
    this.calibrateY = y === undefined ? this.calibrateY : y;
  };

  Parallax.prototype.invert = function(x, y) {
    this.invertX = x === undefined ? this.invertX : x;
    this.invertY = y === undefined ? this.invertY : y;
  };

  Parallax.prototype.friction = function(x, y) {
    this.frictionX = x === undefined ? this.frictionX : x;
    this.frictionY = y === undefined ? this.frictionY : y;
  };

  Parallax.prototype.scalar = function(x, y) {
    this.scalarX = x === undefined ? this.scalarX : x;
    this.scalarY = y === undefined ? this.scalarY : y;
  };

  Parallax.prototype.limit = function(x, y) {
    this.limitX = x === undefined ? this.limitX : x;
    this.limitY = y === undefined ? this.limitY : y;
  };

  Parallax.prototype.origin = function(x, y) {
    this.originX = x === undefined ? this.originX : x;
    this.originY = y === undefined ? this.originY : y;
  };

  Parallax.prototype.clamp = function(value, min, max) {
    value = Math.max(value, min);
    value = Math.min(value, max);
    return value;
  };

  Parallax.prototype.css = function(element, property, value) {
    var jsProperty = this.propertyCache[property];
    if (!jsProperty) {
      for (var i = 0, l = this.vendors.length; i < l; i++) {
        if (this.vendors[i] !== null) {
          jsProperty = this.camelCase(this.vendors[i][1] + '-' + property);
        } else {
          jsProperty = property;
        }
        if (element.style[jsProperty] !== undefined) {
          this.propertyCache[property] = jsProperty;
          break;
        }
      }
    }
    element.style[jsProperty] = value;
  };

  Parallax.prototype.accelerate = function(element) {
    this.css(element, 'transform', 'translate3d(0,0,0)');
    this.css(element, 'transform-style', 'preserve-3d');
    this.css(element, 'backface-visibility', 'hidden');
  };

  Parallax.prototype.setPosition = function(element, x, y) {
    x += 'px';
    y += 'px';
    if (this.transform3DSupport) {
      this.css(element, 'transform', 'translate3d('+x+','+y+',0)');
    } else if (this.transform2DSupport) {
      this.css(element, 'transform', 'translate('+x+','+y+')');
    } else {
      element.style.left = x;
      element.style.top = y;
    }
  };

  Parallax.prototype.onOrientationTimer = function(event) {
    if (this.orientationSupport && this.orientationStatus === 0) {
      this.disable();
      this.orientationSupport = false;
      this.enable();
    }
  };

  Parallax.prototype.onCalibrationTimer = function(event) {
    this.calibrationFlag = true;
  };

  Parallax.prototype.onWindowResize = function(event) {
    this.updateDimensions();
  };

  Parallax.prototype.onAnimationFrame = function() {
    this.updateBounds();
    var dx = this.ix - this.cx;
    var dy = this.iy - this.cy;
    if ((Math.abs(dx) > this.calibrationThreshold) || (Math.abs(dy) > this.calibrationThreshold)) {
      this.queueCalibration(0);
    }
    if (this.portrait) {
      this.mx = this.calibrateX ? dy : this.iy;
      this.my = this.calibrateY ? dx : this.ix;
    } else {
      this.mx = this.calibrateX ? dx : this.ix;
      this.my = this.calibrateY ? dy : this.iy;
    }
    this.mx *= this.ew * (this.scalarX / 100);
    this.my *= this.eh * (this.scalarY / 100);
    if (!isNaN(parseFloat(this.limitX))) {
      this.mx = this.clamp(this.mx, -this.limitX, this.limitX);
    }
    if (!isNaN(parseFloat(this.limitY))) {
      this.my = this.clamp(this.my, -this.limitY, this.limitY);
    }
    this.vx += (this.mx - this.vx) * this.frictionX;
    this.vy += (this.my - this.vy) * this.frictionY;
    for (var i = 0, l = this.layers.length; i < l; i++) {
      var layer = this.layers[i];
      var depth = this.depths[i];
      var xOffset = this.vx * depth * (this.invertX ? -1 : 1);
      var yOffset = this.vy * depth * (this.invertY ? -1 : 1);
      this.setPosition(layer, xOffset, yOffset);
    }
    this.raf = requestAnimationFrame(this.onAnimationFrame);
  };

  Parallax.prototype.onDeviceOrientation = function(event) {

    // Validate environment and event properties.
    if (!this.desktop && event.beta !== null && event.gamma !== null) {

      // Set orientation status.
      this.orientationStatus = 1;

      // Extract Rotation
      var x = (event.beta  || 0) / MAGIC_NUMBER; //  -90 :: 90
      var y = (event.gamma || 0) / MAGIC_NUMBER; // -180 :: 180

      // Detect Orientation Change
      var portrait = this.wh > this.ww;
      if (this.portrait !== portrait) {
        this.portrait = portrait;
        this.calibrationFlag = true;
      }

      // Set Calibration
      if (this.calibrationFlag) {
        this.calibrationFlag = false;
        this.cx = x;
        this.cy = y;
      }

      // Set Input
      this.ix = x;
      this.iy = y;
    }
  };

  Parallax.prototype.onMouseMove = function(event) {

    // Cache mouse coordinates.
    var clientX = event.clientX;
    var clientY = event.clientY;

    // Calculate Mouse Input
    if (!this.orientationSupport && this.relativeInput) {

      // Clip mouse coordinates inside element bounds.
      if (this.clipRelativeInput) {
        clientX = Math.max(clientX, this.ex);
        clientX = Math.min(clientX, this.ex + this.ew);
        clientY = Math.max(clientY, this.ey);
        clientY = Math.min(clientY, this.ey + this.eh);
      }

      // Calculate input relative to the element.
      this.ix = (clientX - this.ex - this.ecx) / this.erx;
      this.iy = (clientY - this.ey - this.ecy) / this.ery;

    } else {

      // Calculate input relative to the window.
      this.ix = (clientX - this.wcx) / this.wrx;
      this.iy = (clientY - this.wcy) / this.wry;
    }
  };

  // Expose Parallax
  window[NAME] = Parallax;

})(window, document);

/*! WOW - v1.1.2 - 2015-04-07
* Copyright (c) 2015 Matthieu Aussaguel; Licensed MIT */(function(){var a,b,c,d,e,f=function(a,b){return function(){return a.apply(b,arguments)}},g=[].indexOf||function(a){for(var b=0,c=this.length;c>b;b++)if(b in this&&this[b]===a)return b;return-1};b=function(){function a(){}return a.prototype.extend=function(a,b){var c,d;for(c in b)d=b[c],null==a[c]&&(a[c]=d);return a},a.prototype.isMobile=function(a){return/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(a)},a.prototype.createEvent=function(a,b,c,d){var e;return null==b&&(b=!1),null==c&&(c=!1),null==d&&(d=null),null!=document.createEvent?(e=document.createEvent("CustomEvent"),e.initCustomEvent(a,b,c,d)):null!=document.createEventObject?(e=document.createEventObject(),e.eventType=a):e.eventName=a,e},a.prototype.emitEvent=function(a,b){return null!=a.dispatchEvent?a.dispatchEvent(b):b in(null!=a)?a[b]():"on"+b in(null!=a)?a["on"+b]():void 0},a.prototype.addEvent=function(a,b,c){return null!=a.addEventListener?a.addEventListener(b,c,!1):null!=a.attachEvent?a.attachEvent("on"+b,c):a[b]=c},a.prototype.removeEvent=function(a,b,c){return null!=a.removeEventListener?a.removeEventListener(b,c,!1):null!=a.detachEvent?a.detachEvent("on"+b,c):delete a[b]},a.prototype.innerHeight=function(){return"innerHeight"in window?window.innerHeight:document.documentElement.clientHeight},a}(),c=this.WeakMap||this.MozWeakMap||(c=function(){function a(){this.keys=[],this.values=[]}return a.prototype.get=function(a){var b,c,d,e,f;for(f=this.keys,b=d=0,e=f.length;e>d;b=++d)if(c=f[b],c===a)return this.values[b]},a.prototype.set=function(a,b){var c,d,e,f,g;for(g=this.keys,c=e=0,f=g.length;f>e;c=++e)if(d=g[c],d===a)return void(this.values[c]=b);return this.keys.push(a),this.values.push(b)},a}()),a=this.MutationObserver||this.WebkitMutationObserver||this.MozMutationObserver||(a=function(){function a(){"undefined"!=typeof console&&null!==console&&console.warn("MutationObserver is not supported by your browser."),"undefined"!=typeof console&&null!==console&&console.warn("WOW.js cannot detect dom mutations, please call .sync() after loading new content.")}return a.notSupported=!0,a.prototype.observe=function(){},a}()),d=this.getComputedStyle||function(a){return this.getPropertyValue=function(b){var c;return"float"===b&&(b="styleFloat"),e.test(b)&&b.replace(e,function(a,b){return b.toUpperCase()}),(null!=(c=a.currentStyle)?c[b]:void 0)||null},this},e=/(\-([a-z]){1})/g,this.WOW=function(){function e(a){null==a&&(a={}),this.scrollCallback=f(this.scrollCallback,this),this.scrollHandler=f(this.scrollHandler,this),this.resetAnimation=f(this.resetAnimation,this),this.start=f(this.start,this),this.scrolled=!0,this.config=this.util().extend(a,this.defaults),this.animationNameCache=new c,this.wowEvent=this.util().createEvent(this.config.boxClass)}return e.prototype.defaults={boxClass:"wow",animateClass:"animated",offset:0,mobile:!0,live:!0,callback:null},e.prototype.init=function(){var a;return this.element=window.document.documentElement,"interactive"===(a=document.readyState)||"complete"===a?this.start():this.util().addEvent(document,"DOMContentLoaded",this.start),this.finished=[]},e.prototype.start=function(){var b,c,d,e;if(this.stopped=!1,this.boxes=function(){var a,c,d,e;for(d=this.element.querySelectorAll("."+this.config.boxClass),e=[],a=0,c=d.length;c>a;a++)b=d[a],e.push(b);return e}.call(this),this.all=function(){var a,c,d,e;for(d=this.boxes,e=[],a=0,c=d.length;c>a;a++)b=d[a],e.push(b);return e}.call(this),this.boxes.length)if(this.disabled())this.resetStyle();else for(e=this.boxes,c=0,d=e.length;d>c;c++)b=e[c],this.applyStyle(b,!0);return this.disabled()||(this.util().addEvent(window,"scroll",this.scrollHandler),this.util().addEvent(window,"resize",this.scrollHandler),this.interval=setInterval(this.scrollCallback,50)),this.config.live?new a(function(a){return function(b){var c,d,e,f,g;for(g=[],c=0,d=b.length;d>c;c++)f=b[c],g.push(function(){var a,b,c,d;for(c=f.addedNodes||[],d=[],a=0,b=c.length;b>a;a++)e=c[a],d.push(this.doSync(e));return d}.call(a));return g}}(this)).observe(document.body,{childList:!0,subtree:!0}):void 0},e.prototype.stop=function(){return this.stopped=!0,this.util().removeEvent(window,"scroll",this.scrollHandler),this.util().removeEvent(window,"resize",this.scrollHandler),null!=this.interval?clearInterval(this.interval):void 0},e.prototype.sync=function(){return a.notSupported?this.doSync(this.element):void 0},e.prototype.doSync=function(a){var b,c,d,e,f;if(null==a&&(a=this.element),1===a.nodeType){for(a=a.parentNode||a,e=a.querySelectorAll("."+this.config.boxClass),f=[],c=0,d=e.length;d>c;c++)b=e[c],g.call(this.all,b)<0?(this.boxes.push(b),this.all.push(b),this.stopped||this.disabled()?this.resetStyle():this.applyStyle(b,!0),f.push(this.scrolled=!0)):f.push(void 0);return f}},e.prototype.show=function(a){return this.applyStyle(a),a.className=a.className+" "+this.config.animateClass,null!=this.config.callback&&this.config.callback(a),this.util().emitEvent(a,this.wowEvent),this.util().addEvent(a,"animationend",this.resetAnimation),this.util().addEvent(a,"oanimationend",this.resetAnimation),this.util().addEvent(a,"webkitAnimationEnd",this.resetAnimation),this.util().addEvent(a,"MSAnimationEnd",this.resetAnimation),a},e.prototype.applyStyle=function(a,b){var c,d,e;return d=a.getAttribute("data-wow-duration"),c=a.getAttribute("data-wow-delay"),e=a.getAttribute("data-wow-iteration"),this.animate(function(f){return function(){return f.customStyle(a,b,d,c,e)}}(this))},e.prototype.animate=function(){return"requestAnimationFrame"in window?function(a){return window.requestAnimationFrame(a)}:function(a){return a()}}(),e.prototype.resetStyle=function(){var a,b,c,d,e;for(d=this.boxes,e=[],b=0,c=d.length;c>b;b++)a=d[b],e.push(a.style.visibility="visible");return e},e.prototype.resetAnimation=function(a){var b;return a.type.toLowerCase().indexOf("animationend")>=0?(b=a.target||a.srcElement,b.className=b.className.replace(this.config.animateClass,"").trim()):void 0},e.prototype.customStyle=function(a,b,c,d,e){return b&&this.cacheAnimationName(a),a.style.visibility=b?"hidden":"visible",c&&this.vendorSet(a.style,{animationDuration:c}),d&&this.vendorSet(a.style,{animationDelay:d}),e&&this.vendorSet(a.style,{animationIterationCount:e}),this.vendorSet(a.style,{animationName:b?"none":this.cachedAnimationName(a)}),a},e.prototype.vendors=["moz","webkit"],e.prototype.vendorSet=function(a,b){var c,d,e,f;d=[];for(c in b)e=b[c],a[""+c]=e,d.push(function(){var b,d,g,h;for(g=this.vendors,h=[],b=0,d=g.length;d>b;b++)f=g[b],h.push(a[""+f+c.charAt(0).toUpperCase()+c.substr(1)]=e);return h}.call(this));return d},e.prototype.vendorCSS=function(a,b){var c,e,f,g,h,i;for(h=d(a),g=h.getPropertyCSSValue(b),f=this.vendors,c=0,e=f.length;e>c;c++)i=f[c],g=g||h.getPropertyCSSValue("-"+i+"-"+b);return g},e.prototype.animationName=function(a){var b;try{b=this.vendorCSS(a,"animation-name").cssText}catch(c){b=d(a).getPropertyValue("animation-name")}return"none"===b?"":b},e.prototype.cacheAnimationName=function(a){return this.animationNameCache.set(a,this.animationName(a))},e.prototype.cachedAnimationName=function(a){return this.animationNameCache.get(a)},e.prototype.scrollHandler=function(){return this.scrolled=!0},e.prototype.scrollCallback=function(){var a;return!this.scrolled||(this.scrolled=!1,this.boxes=function(){var b,c,d,e;for(d=this.boxes,e=[],b=0,c=d.length;c>b;b++)a=d[b],a&&(this.isVisible(a)?this.show(a):e.push(a));return e}.call(this),this.boxes.length||this.config.live)?void 0:this.stop()},e.prototype.offsetTop=function(a){for(var b;void 0===a.offsetTop;)a=a.parentNode;for(b=a.offsetTop;a=a.offsetParent;)b+=a.offsetTop;return b},e.prototype.isVisible=function(a){var b,c,d,e,f;return c=a.getAttribute("data-wow-offset")||this.config.offset,f=window.pageYOffset,e=f+Math.min(this.element.clientHeight,this.util().innerHeight())-c,d=this.offsetTop(a),b=d+a.clientHeight,e>=d&&b>=f},e.prototype.util=function(){return null!=this._util?this._util:this._util=new b},e.prototype.disabled=function(){return!this.config.mobile&&this.util().isMobile(navigator.userAgent)},e}()}).call(this);