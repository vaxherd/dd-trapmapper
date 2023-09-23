import Two from "./lib/two/src/two.js";

////////////////////////////////////////////////////////////////////////
// Entry point

// Create base canvas.
const two = new Two({type: Two.Types.canvas,
                     fullscreen: true,
                     autostart: true});
two.appendTo(document.body);

// Create background image for map.
const bg = new Two.Sprite("./data/default-bg.png",
                          two.width/2, two.height/2, 1, 1);
const bg_width = bg.texture.image.width;
const bg_height = bg.texture.image.height;
bg.scale = two.width / bg_width;
two.add(bg);

// Set up mouse tracking.  We track both the current mouse position and
// the equivalent coordinates on the map image.
var mouse_x = two.width/2;
var mouse_y = two.height/2;
var bg_x = bg_width/2;
var bg_y = bg_height/2;
window.addEventListener("mousemove", function(e) {
    mouse_x = e.clientX;
    mouse_y = e.clientY;
    [bg_x, bg_y] = coord_to_bg(mouse_x, mouse_y);
    if (e.buttons & 4) {
        bg.position.x += e.movementX;
        bg.position.y += e.movementY;
        two.update();
    }
});
window.addEventListener("wheel", function(e) {
    // assert(e.deltaMode == WheelEvent.DOM_DELTA_PIXEL);
    const old_scale = bg.scale;
    bg.scale *= 2 ** (e.deltaY/-500);
    // Also offset the image so we zoom in/out around the pointer position:
    //    (xy - pos1) / scale1 = (xy - pos2) / scale2
    //    (xy - pos1) * scale2 = (xy - pos2) * scale1
    //    xy*scale2 - pos1*scale2 = xy*scale1 - pos2*scale1
    //    pos2*scale1 = xy*scale1 - (xy*scale2 - pos1*scale2)
    //    pos2 = xy - ((xy*scale2 - pos1*scale2) / scale1)
    //    pos2 = xy - ((xy - pos1) * scale2 / scale1)
    const zoom = bg.scale / old_scale;
    bg.position.x = mouse_x - ((mouse_x - bg.position.x) * zoom);
    bg.position.y = mouse_y - ((mouse_y - bg.position.y) * zoom);
    two.update();
});


//FIXME temp icon testing
const yellow = new Two.Circle(two.width/2, two.height/2, 4, 32);
yellow.noStroke().fill = "#FFF000";
two.add(yellow);


////////////////////////////////////////////////////////////////////////

// Convert global (window) coordinates to background image coordinates
function coord_to_bg(x, y)
{
    return [(x - bg.position.x) / bg.scale + bg_width/2,
            (y - bg.position.y) / bg.scale + bg_height/2];
}
