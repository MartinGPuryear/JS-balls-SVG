/*

  js_balls.js

      Javascript Balls is a simple client-side JS program to demonstrate basic 
      graphics using SVG, including very simple collision and wall detection, 
      static audio playback, and perhaps most interestingly the optional use
      of the high-resolution timer.  

      There are three main classes - timer, playground and circle.  

      The timer object abstracts whether the browser supports a high-resolution
      timer, and returns the current time. To be fair, much of this code is
      adapted from MDN, but it is similar to other timer-related work I did for
      at Microsoft for Windows audio/MIDI, and at Digidesign/Avid for ProTools.

      The playground object represents the overall boundaries and implements 
      the game loop - that is, it tracks the circle objects has a periodic 
      timer that (every ms) checks for collisions, and updates positions. 
      Checking for collisions includes handling collisions between balls, as
      well as collisions of circles with walls.  Also, each circle has a 
      velocity, so after every timer interval the playground object updates
      the positions of each circle.  

      The circle object is represented as an SVG object as well as an HTML
      DOM object appended to the parent svg.  The circle's attributes include
      its radius, coordinates for its center, its velocity, and strength.  
      The circle knows how to check for a wall collision, and how to update
      its position (so for these, the playground object simply delegates).

      Note that a circle is created by a mousedown/mouseup event pair.  
      The length of time that the mouse button is held down will determine
      the radius of the circle.  The default 'strength' of a circle is 1, 
      augmented by holding down the ctrl, alt, shift keys or mouse wheel.
      The velocity of the circle is random.  When two circles collide, an
      audio file is played, and the strength of each circle is reduced.
      If a circle's strength is depleted, it begins the 'delete' process 
      by turning red and shrinking (radius) by 1 pixel each timer interval
      until it disappears - at which time a different audio file plays.

*/
  var TIMER_INTERVAL_MS = 1;
  var MAX_VELOCITY = 3;
  var DURATION_RADIUS_SCALING_FACTOR = 0.55;
  var INITIAL_RADIUS = 10;
  var INITIAL_STRENGTH = 1;

  var hrBeginTimeStamp, hrEndTimeStamp;

  //  Our global timer object
  var hrTimer = new HighResTimer();

  //  HighResTimer object provides gettime functionality
  function HighResTimer()
  {
    this.hrNativeSppt = false;
    this.hrSupport = false;
    this.hrSpptPrefix = null;

    //  our recurring wall-clock function, depending on browser support 
    this.hrGetTime = function()
    {
      if (this.hrNativeSppt)
      {
        return window.performance.now();
      }
      if (this.hrSupport)
      {
        return window.performance[this.hrSpptPrefix + "Now"]();
      }
      var date = new Date();
      return date.getTime(); 
    }
    
    //  check for .performance support, and set flags to indicate
    //  the support level.  Self-initializing, so return self.
    if (window.performance !== undefined) 
    {
      if (window.performance.now !== undefined)
      {
        console.log("Native high-res timer");
        this.hrNativeSppt = true;
        return this;
      }

      var browserPrefixes = ["webkit","moz","ms","o"];
      for(var i = 0; i < browserPrefixes.length; i++) 
      {
        if (window.performance[browserPrefixes[i] + "Now"] != undefined) 
        {
          this.hrSpptPrefix = browserPrefixes[i];
          this.hrSupport = true;
          console.log("Non-native high-res timer support: ", browserPrefixes[i]);
          return this;
        }
      }
    }
    if (this.hrSpptPrefix === null)
    {
      console.log("No high-res timer support, falling back to Date.getTime");
    }
    return this;
  }

  //  track when we moused-down, to calculate the 'how-long pressed' interval
  document.onmousedown = function(evt) 
  {
    hrBeginTimeStamp = hrTimer.hrGetTime();
  }

  //  When mouse button goes up, calculate how long we were pressed, determine
  //  the strength of this circle from the click type (which keys), and create
  //  a new circle. 
  document.onmouseup = function(evt)
  {
    hrEndTimeStamp = hrTimer.hrGetTime();

    var radius = Math.pow(hrEndTimeStamp - hrBeginTimeStamp, DURATION_RADIUS_SCALING_FACTOR);
    var strength = getClickType(evt);
    playground.createNewCircle(evt.x, evt.y, radius, strength);
  }
  
  //  Retrieve the combination of shift, ctrl, alt, and mouse wheel keys.
  function getClickType(evt)
  {
    return ((evt.button & 0x1) << 3) + (evt.altKey << 2) + (evt.ctrlKey << 1) + evt.shiftKey;
  }

  //  PlayGround obnject tracks the list of circles and implements the 
  //  callback function that the timer calls periodically.  
  function PlayGround()
  {
    var counter = 0;
    var circles = [ ];
    var colisions = [ ];
    var self = this;

    //  First, handle any ball collisions.  If any balls were destroyed, 
    //  get rid of them.  Then, deal with any wall collisions with the
    //  appropriate bounces.  
    this.checkForCollisions = function()
    {
      this.checkForBallCollisions();
      this.handleDeletions();
      this.checkForWallCollisions();
    }

    //  To determine whether balls are colliding with balls or walls, 
    //  we need to calculate the distance between two coordinates. 
    //  Simple math using Pythagorean formula. 
    this.getDistance = function(c1, c2)
    {
      var xDelta = c1.info.cx - c2.info.cx;
      var yDelta = c1.info.cy - c2.info.cy;

      return Math.sqrt(Math.pow(xDelta, 2) + Math.pow(yDelta, 2));
    }

    //  Run through our list of circles.  For those that have
    //  collided with others, check whether the radius has been
    //  reduced to zero, and if so, delete the circle from our 
    //  list and play the 'trash' sound.  
    this.handleDeletions = function()
    {
      for (c1 in circles)
      {
        if (circles[c1] && circles[c1].collided)
        {
          if (circles[c1].info.r <= 0)
          {
            circles[c1].remove();
            delete circles[c1];
            document.getElementById('trash').play();
          }
        }
      }
    }

    //  For every circle in our list, check the distance between
    //  it and each of the other circles.  If this distance is 
    //  less than the sum of the two radii, then the balls have 
    //  collided.  
    //  For now, I do not have the balls bounce as a result of
    //  colliding with another ball, but if in the future I add
    //  this, I will probably (for fun) have the 'stronger' ball
    //  continue with its direction unaffected, while the 'weaker'
    //  ball is fully reflected. 
    this.checkForBallCollisions = function()
    {
      for (c1 in circles) {
        if (circles[c1]) {
          for (c2 in circles) {
            if (circles[c2] && (circles[c1] !== circles [c2])) {
              var distance = this.getDistance(circles[c1], circles[c2])
              if (distance < (circles[c1].info.r + circles[c2].info.r))
              {
                circles[c1].collided = true;
                circles[c2].collided = true;
              }
            }
          }
        }
      }
    }

    //  Simply ask each ball to check for a wall collision.
    this.checkForWallCollisions = function()
    {
      for(circle in circles)
      {
        if (circles[circle])
        {
          circles[circle].checkForWallCollision();
        }
      }
    }

    //  Simply ask each ball to update its position.
    this.updatePositions = function()
    {
      for(circle in circles)
      {
        if (circles[circle])
        {
          circles[circle].update(1);
        }
      }
    }

    //  Create new Circle with the provided coords, radius, strength.
    this.createNewCircle = function(x, y, rad, strength)
    {
      var new_circle = new Circle(x, y, rad, strength, counter++);
      circles.push(new_circle);
    }

    //  Every timer interval (1 ms), call this loop function.
    //  Check for collisions, and update positions.  
    this.loop = function()
    {
      self.checkForCollisions();
      self.updatePositions();
    }
    
    setInterval(this.loop, TIMER_INTERVAL_MS);

    //  start out life with one circle already on the canvas.  
    this.createNewCircle(document.body.clientWidth / 2, document.body.clientHeight / 2, INITIAL_RADIUS, INITIAL_STRENGTH);
  }
  
  //  The circle object handles wall collisions, velocity 
  //  and position updates, and its 'strength'.
  //  Velocity is randomly chosen, within MAX_VELOCITY bounds.
  //  Note that each circle is tracked by SVG, but is an 
  //  entity in the HTML DOM as well.  
  function Circle(cx, cy, radius, strength, html_id)
  {
    var html_id = html_id;
    this.collided = false;
    this.strength = strength;
    this.info = { cx: cx,  cy: cy, r: radius };
    
    var randomNumberBetween = function(min, max) { return Math.random() * (max - min) + min; }

    //  set the initial velocity, create the SVG object, and
    //  append it to the DOM. 
    this.initialize = function()
    {
      this.info.velocity = {  x: randomNumberBetween(-MAX_VELOCITY,MAX_VELOCITY)/Math.pow(this.info.r, 0.5), 
                  y: randomNumberBetween(-MAX_VELOCITY,MAX_VELOCITY)/Math.pow(this.info.r, 0.5) }

      var circle = makeSVG('circle', 
        {   cx: this.info.cx,
            cy: this.info.cy,
            r:  this.info.r,
            id: html_id,
            style: "fill: #0"+this.strength.toString(16)+this.strength.toString(16)
        });
      document.getElementById('svg').appendChild(circle);
    }

    //  delete our element from the DOM
    this.remove = function()
    {
      var el = document.getElementById(html_id);
            document.getElementById('svg').removeChild(el);
    }

    //  Check whether we are within a radius of each of the
    //  four walls.  If so, reverse our direction accordingly.
    this.checkForWallCollision = function()
    {
      if ((this.info.cx + this.info.r) > document.body.clientWidth)
      {
        this.info.velocity.x = -Math.abs(this.info.velocity.x);
      }
      else if ((this.info.cx - this.info.r) < 0)
      {
        this.info.velocity.x = Math.abs(this.info.velocity.x);
      }
      if ((this.info.cy + this.info.r) > document.body.clientHeight)
      {
        this.info.velocity.y = -Math.abs(this.info.velocity.y);
      }
      else if ((this.info.cy - this.info.r) < 0)
      {
        this.info.velocity.y = Math.abs(this.info.velocity.y);
      } 
    }

    //  Use our previous position, and our velocity, to calculate 
    //  a new position.  
    //
    //  Also, if we've collided with another ball, do a series of
    //  checks. Check whether we have sufficient strength to stay
    //  alive. If we do, then update our color (color indicates)
    //  strength level), actual strength, and play a sound.  
    //  If our strength is zero, decrement our radius and change
    //  our color to red.   
    this.update = function(time)
    {
      var el = document.getElementById(html_id);

      this.info.cx += (this.info.velocity.x * time);
      this.info.cy += (this.info.velocity.y * time);

      el.setAttribute("cx", this.info.cx);
      el.setAttribute("cy", this.info.cy);
      if (this.collided)
      {
        if (this.strength > 0)
        {
          this.strength--;
          document.getElementById('zee-ow').play();

          //  Strength is a number between 1 and 15, so convert
          //  our strength into a color.  Default (1) is 0x011,
          //  or mostly black.  Max would be 0x0FF, or a light
          //  aqua blue.  
          el.setAttribute("style", "fill: #0"+this.strength.toString(16)+this.strength.toString(16));
          this.collided = false;
        }
        else
        {
          this.info.r = Math.max(this.info.r - 1, 0);
          el.setAttribute("r", this.info.r);
          el.setAttribute("style", "fill: red");
        }
      }
    }

    //  Create an object in the SVG with these attributes.
    var makeSVG = function(tag, attrs)
    {
      var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (var k in attrs)
      {
        el.setAttribute(k, attrs[k]);
      }
      return el;
    }
    this.initialize();
  }
