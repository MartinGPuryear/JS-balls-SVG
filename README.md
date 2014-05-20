JS-balls-SVG
Martin G. Puryear

============

  JS-balls-SVG 
  
  Demonstrates client javascript, including basic collision physics, 
SVG, and rudimentary audio.

---

  Timer object utilizes browser support for high-resolution timer, 
if present, otherwise falling back to getTime(). Timer calls the
main game loop periodically (default is 1 ms).  
  
  Playground object tracks multiple circle objects as they move
around the screen.  It catches mouse clicks and converts these into 
Circle objects with certain radius, velocity and 'strength'.  Each 
time the timer fires, the playground object checks for collisions
and updates positions.  Much of this is done simply by telling 
each Circle object to do this for itself.  However, it also checks
for ball-ball collisions, and handles Circle creation/deletion.

  Circle object implements a graphics circle that moves around the 
screen.  Note that circles are SVG objects as well as HTML DOM
entities.  Standard collision detection simply uses Pythagorean
calculation to determine distance between objects (for example, 
comparing this distance to the sum of the two radii for ball-ball 
collision).  The balls bounce off walls as expected, but ball-ball
bounce is not implemented.  
