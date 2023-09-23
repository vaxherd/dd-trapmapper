import Two from "./lib/two/src/two.js";

////////////////////////////////////////////////////////////////////////
// Miscellaneous utility routines

/* Return the squared distance between the two given points. */
function distance2(x1, y1, x2, y2)
{
    return (x2-x1)**2 + (y2-y1)**2;
}

////////////////////////////////////////////////////////////////////////
// Trap data management

class Trap
{
    /* Absolute coordinates of trap on map image */
    x = 0;
    y = 0;
    /* Coordinates of trap relative to room center */
    room_x = 0;
    room_y = 0;
    /* Trap index (positive integer, 0 if unset) */
    index = 0;
    /* Trap color index */
    color = 0;
    /* Trap icon (Two.Sprite) */
    icon = null;
    /* Trap images (Two.Sprite) */
    images = [];
    /* Hoard image (Two.Sprite), null if none */
    hoard = null;

    constructor(x, y, room_x, room_y, index)
    {
        this.x = x;
        this.y = y;
        this.room_x = room_x;
        this.room_y = room_y;
        this.index = index;
    }
}

////////////////////////////////////////////////////////////////////////
// Map data management

/* Class encapsulating a background image and room divisions for a map. */
class TrapMap
{
    /* Source image location */
    src = "./data/default-bg.png";
    /* Coordinates of room centers: list of 50 coordinate pairs, row-major.
     * Corner rooms (A11, A15, ...) are ignored */
    rooms = [[   0,   0], [ 624, 192], [1008, 192], [1392, 192], [   0,   0],
             [   0,   0], [2672, 192], [3056, 192], [3440, 192], [   0,   0],
             [ 240, 576], [ 624, 576], [1008, 576], [1392, 576], [1776, 576],
             [2288, 576], [2672, 576], [3056, 576], [3440, 576], [3824, 576],
             [ 240, 960], [ 624, 960], [1008, 960], [1392, 960], [1776, 960],
             [2288, 960], [2672, 960], [3056, 960], [3440, 960], [3824, 960],
             [ 240,1344], [ 624,1344], [1008,1344], [1392,1344], [1776,1344],
             [2288,1344], [2672,1344], [3056,1344], [3440,1344], [3824,1344],
             [   0,   0], [ 624,1728], [1008,1728], [1392,1728], [   0,   0],
             [   0,   0], [2672,1728], [3056,1728], [3440,1728], [   0,   0]];
    /* Image (Two.Sprite) instance */
    image = null;
    /* Image size (for convenience) */
    width = 0;
    height = 0;
    /* List of traps (Trap instances) per room, indexed by room ID */
    room_traps = new Map();

    constructor(src, div_x, div_y)
    {
        if (src) {
            this.src = src;
            if (div_y) {
                this.div_x = div_x;
                this.div_y = div_y;
            }
        }
        this.image = new Two.Sprite(this.src, two.width/2, two.height/2, 1, 1);
        this.width = this.image.texture.image.width;
        this.height = this.image.texture.image.height;
        this.image.scale = two.width / this.width;
    }

    /* Iterate over all traps. */
    forEachTrap(f)
    {
        this.room_traps.forEach(function(traps) {
            traps.forEach(f);
        });
    }

    /* Convert global (window) coordinates to background image coordinates. */
    fromGlobal(x, y)
    {
        return [(x - this.image.position.x) / this.image.scale + this.width/2,
                (y - this.image.position.y) / this.image.scale + this.height/2];
    }

    /* Adjust the map position by the given coordinate deltas. */
    adjustPosition(dx, dy)
    {
        this.image.position.x += dx;
        this.image.position.y += dy;
        this.forEachTrap(function(trap) {
            trap.icon.position.x += dx;
            trap.icon.position.y += dy;
        });
    }

    /* Adjust the map scale by the given factor, centered on the given
     * window coordinates. */
    adjustScale(factor, x, y)
    {
        const old_scale = this.image.scale;
        this.image.scale *= factor;
        // Also offset the image so we zoom in/out around the pointer position:
        //    (xy - pos1) / scale1 = (xy - pos2) / scale2
        //    (xy - pos1) * scale2 = (xy - pos2) * scale1
        //    xy*scale2 - pos1*scale2 = xy*scale1 - pos2*scale1
        //    pos2*scale1 = xy*scale1 - (xy*scale2 - pos1*scale2)
        //    pos2 = xy - ((xy*scale2 - pos1*scale2) / scale1)
        //    pos2 = xy - ((xy - pos1) * scale2 / scale1)
        const zoom = this.image.scale / old_scale;
        const new_x = mouse_x - ((mouse_x - map.image.position.x) * zoom);
        const new_y = mouse_y - ((mouse_y - map.image.position.y) * zoom);
        this.image.position.x = new_x;
        this.image.position.y = new_y;
        const w2 = this.width / 2;
        const h2 = this.height/2;
        const s = this.image.scale;
        this.forEachTrap(function(trap) {
            trap.icon.position.x = new_x + ((trap.x - w2) * s);
            trap.icon.position.y = new_y + ((trap.y - h2) * s);
            trap.icon.scale *= factor;
        });
    }

    /* Return the room ID (string) for the given background image
     * coordinates.  If with_center is true, also return the room center
     * coordinates. */
    roomId(x, y, with_center=false)
    {
        var best = 0;
        var best_dist2 = Infinity;
        this.rooms.forEach(function(center, i) {
            if ((i%5 == 0 || i%5 == 4) && (i < 10 || i >= 40)) {
                // Corner room, ignore
            } else {
                var dist2 = distance2(x, y, center[0], center[1]);
                if (dist2 < best_dist2) {
                    best = i;
                    best_dist2 = dist2;
                }
            }
        });
        var rx = best % 10;
        var ry = Math.trunc(best / 10);
        var prefix;
        if (rx >= 5) {
            prefix = "B";
            rx -= 5;
        } else {
            prefix = "A";
        }
        const id = prefix + (ry+1) + (rx+1);
        if (with_center) {
            return [id, this.rooms[best][0], this.rooms[best][1]];
        } else {
            return id;
        }
    }

    /* Find the trap closest to the given point.  Returns null if there are
     * no traps in the room associated with the point. */
    getTrap(x, y)
    {
        const room = this.roomId(x, y);
        const traps = this.room_traps.get(room) || [];
        var best = null;
        var best_dist2 = Infinity;
        traps.forEach(function(trap) {
            var dist2 = distance2(x, y, trap.x, trap.y);
            if (dist2 < best_dist2) {
                best = trap;
                best_dist2 = dist2;
            }
        });
        return best;
    }

    /* Add a trap at the given point, and return the new trap. */
    addTrap(x, y) {
        const [room, room_x, room_y] = this.roomId(x, y, true);
        if (!this.room_traps.get(room)) {
            this.room_traps.set(room, []);
        }
        const traps = this.room_traps.get(room);
        var index;
        for (index = 1; ; index++) {
            var found = false;
            traps.forEach(function(trap) {
                found ||= (trap.index == index);
            });
            if (!found) {
                break;
            }
        }
        const trap = new Trap(x, y, x-room_x, y-room_y, index);
        traps.push(trap);
        return trap;
    }
}

////////////////////////////////////////////////////////////////////////
// Entry point

// Create base canvas.
const two = new Two({type: Two.Types.canvas,
                     fullscreen: true,
                     autostart: true});
two.appendTo(document.body);

// Load map and trap data.
const map = new TrapMap();
two.add(map.image);

// Set up mouse tracking and related state.  We track both the current
// mouse position and the equivalent coordinates on the map image.
var mouse_x = two.width/2;
var mouse_y = two.height/2;
var bg_x = map.width/2;
var bg_y = map.height/2;
var mouse_trap = null;
var clicked_trap = null;
var click_x = 0;  // bg_[xy] at click time
var click_y = 0;
window.addEventListener("mousemove", onMouseMove);
window.addEventListener("mousedown", onMouseDown);
window.addEventListener("mouseup", onMouseUp);
window.addEventListener("wheel", onMouseWheel);

////////////////////////////////////////////////////////////////////////
// Input callbacks

function onMouseMove(e)
{
    mouse_x = e.clientX;
    mouse_y = e.clientY;
    [bg_x, bg_y] = map.fromGlobal(mouse_x, mouse_y);

    if (e.buttons & 4) {
        map.adjustPosition(e.movementX, e.movementY);
        two.update();
    }

    if (e.buttons & 1) {
        clicked_trap.icon.position.x += e.movementX;
        clicked_trap.icon.position.y += e.movementY;
        two.update();
    } else {
        var trap = map.getTrap(bg_x, bg_y);
        if (trap) {
            var dist = distance2(bg_x, bg_y, trap.x, trap.y) ** 0.5;
            if (dist * map.image.scale > 12) {
                trap = null;
            }
        }
        if (mouse_trap !== trap) {
            if (mouse_trap) {
                mouse_trap.icon.scale /= 1.3;
            }
            if (trap) {
                trap.icon.scale *= 1.3;
            }
        }
        mouse_trap = trap;
    }
}

function onMouseDown(e)
{
    if (e.button == 0) {
        if (mouse_trap) {
            clicked_trap = mouse_trap;
        } else {
            const [x, y] = map.fromGlobal(e.clientX, e.clientY);
            clicked_trap = map.addTrap(x, y);
            clicked_trap.icon = new Two.Circle(e.clientX, e.clientY, 15, 32);
            clicked_trap.icon.noStroke().fill = "rgba(255, 0, 0, 0.4)";
            clicked_trap.icon.scale = map.image.scale * 1.3;
            two.add(clicked_trap.icon);
        }
        click_x = bg_x;
        click_y = bg_y;
    }
}

function onMouseUp(e)
{
    if (e.button == 0) {
        if (!mouse_trap) {
            clicked_trap.icon.fill = "rgba(255, 0, 0, 1.0)";
            two.update();
        }
        clicked_trap.x += bg_x - click_x;
        clicked_trap.y += bg_y - click_y;
        clicked_trap.room_x += bg_x - click_x;
        clicked_trap.room_y += bg_y - click_y;
        mouse_trap = clicked_trap;
        clicked_trap = null;
    }
}

function onMouseWheel(e)
{
    // assert(e.deltaMode == WheelEvent.DOM_DELTA_PIXEL);
    map.adjustScale(2 ** (e.deltaY/-500), mouse_x, mouse_y);
    two.update();
}

////////////////////////////////////////////////////////////////////////
