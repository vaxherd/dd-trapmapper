import Two from "./lib/two/src/two.js";

////////////////////////////////////////////////////////////////////////
// Miscellaneous utility routines

/* Return the squared distance between the two given points. */
function distance2(x1, y1, x2, y2)
{
    return (x2-x1)**2 + (y2-y1)**2;
}


/* Load/save logic based on https://github.com/GoogleChromeLabs/text-editor/ */

/* Ask the user for a file to load, and call the given callback with the
 * selected file's pathname and content.  If the user cancels the load,
 * null will be passed for both callback arguments.  If the file cannot
 * be loaded, the pathname will be passed normally and the data argument
 * will be null. */
function loadFile(callback)
{
    const fs_load = document.getElementById("fs_load");
    fs_load.onchange = function(e) {
        const file = fs_load.files[0];
        if (file) {
            const reader = new FileReader();
            reader.addEventListener("loadend", function(e) {
                const data = e.srcElement.error ? null : e.srcElement.result;
                callback(file.name, data);
            });
            reader.readAsText(file);
        } else {
            // FIXME: this is never reached; apparently there's no way to
            // detect when the user clicks cancel?
            // https://stackoverflow.com/questions/4628544/how-to-detect-when-cancel-is-clicked-on-file-input
            callback(null, null);
        }
    };
    fs_load.click();
}

/* Save the given data (a string) under the given pathname.  If `pathname`
 * is null, ask the user where to save.  (The user-chosen pathname is not
 * returned due to web API limitations.) */
function saveFile(data, pathname)
{
    const fs_save = document.getElementById("fs_save");
    const file = new File([data], "", {type: "text/plain"});
    fs_save.href = window.URL.createObjectURL(file);
    fs_save.setAttribute("download", pathname || "map.json");
    fs_save.click();
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
    /* Trap icon (Two.Group) */
    icon = null;
    /* Trap images (image URL strings) */
    images = [];
    /* Hoard image (image URL string), null if none */
    hoard = null;

    /* Base trap icon (internal) */
    _icon_base = null;
    /* Hoard icon (internal) */
    _icon_hoard = null;
    /* Index overlay (internal) */
    _icon_index = null;

    constructor(x, y, room_x, room_y, index)
    {
        this.x = x;
        this.y = y;
        this.room_x = room_x;
        this.room_y = room_y;
        this.index = index;

        this._icon_base = new Two.Circle(0, 0, 15, 32);
        this._icon_base.noStroke().fill = "rgba(255, 0, 0, 1.0)";
        this._icon_hoard = new Two.Circle(0, 0, 5, 32);
        this._icon_hoard.noStroke().fill = "rgba(255, 255, 0, 1.0)";
        this._icon_hoard.opacity = 0;
        this._icon_index = new Two.Text(this.index, 0, 1);
        this._icon_index.family = window.getComputedStyle(document.querySelector("body")).getPropertyValue("font-family");
        this._icon_index.weight = 700;
        this._icon_index.size = 20;
        this._icon_index.fill = "rgba(255, 255, 255, 1.0)";
        this._icon_index.stroke = "rgba(0, 0, 0, 1.0)";
        this._icon_index.opacity = 0;
        this.icon = new Two.Group(this._icon_base, this._icon_hoard,
                                  this._icon_index);
        this.icon.position.x = x;
        this.icon.position.y = y;
    }

    /* Set whether to display the trap index overlay. */
    setIndexVisible(visible)
    {
        this._icon_index.opacity = visible ? 1.0 : 0.0;
    }
}

////////////////////////////////////////////////////////////////////////
// Map data management

/* Class encapsulating a background image and room divisions for a map. */
class TrapMap
{
    /* Base pathname for image files */
    basePath = "./";
    /* Source image location */
    DEFAULT_SRC = "./data/default-bg.png";
    src = "";
    /* Coordinates of room centers: list of 50 coordinate pairs, row-major.
     * Corner rooms (A11, A15, ...) are ignored */
    DEFAULT_ROOMS = [
        [   0,   0], [ 624, 192], [1008, 192], [1392, 192], [   0,   0],
        [   0,   0], [2672, 192], [3056, 192], [3440, 192], [   0,   0],
        [ 240, 576], [ 624, 576], [1008, 576], [1392, 576], [1776, 576],
        [2288, 576], [2672, 576], [3056, 576], [3440, 576], [3824, 576],
        [ 240, 960], [ 624, 960], [1008, 960], [1392, 960], [1776, 960],
        [2288, 960], [2672, 960], [3056, 960], [3440, 960], [3824, 960],
        [ 240,1344], [ 624,1344], [1008,1344], [1392,1344], [1776,1344],
        [2288,1344], [2672,1344], [3056,1344], [3440,1344], [3824,1344],
        [   0,   0], [ 624,1728], [1008,1728], [1392,1728], [   0,   0],
        [   0,   0], [2672,1728], [3056,1728], [3440,1728], [   0,   0]];
    rooms = this.DEFAULT_ROOMS.slice();
    /* List of traps (Trap instances) per room, indexed by room ID */
    room_traps = new Map();
    /* Two.Group encapsulating all graphic objects (for scrolling/zooming) */
    root_group = null;
    /* Image (Two.Sprite) instance */
    image = null;
    /* Two.Group containing trap icons */
    trap_group = null;
    /* List of room center icons, indexed by room ID */
    room_icons = new Map();
    /* Two.Group containing room center icons */
    room_group = null;
    /* Image size (for convenience) */
    width = 0;
    height = 0;

    constructor()
    {
        this.root_group = two.makeGroup();
        const texture = new Two.Texture(document.getElementById("blank_map"));
        this.width = texture.image.width;
        this.height = texture.image.height;
        this.image = new Two.Sprite(texture, this.width/2, this.height/2, 1, 1);
        const scale = two.width / this.width;
        this.root_group.scale = scale;
        this.root_group.position.x = two.width/2 - (this.width/2)*scale;
        this.root_group.position.y = two.height/2 - (this.height/2)*scale;
        this.root_group.add(this.image);
        this.setBackground(null);
        this.trap_group = new Two.Group();
        this.root_group.add(this.trap_group);
        this._initRoomIcons();
    }

    /* Set the background image (null for the default background image).
     * The image will be loaded asynchronously.  If `relative` is true,
     * `src` is treated as relative to `this.basePath`.*/
    setBackground(src, relative=false)
    {
        if (relative) {
            this.src = this.basePath + src;
        } else {
            this.src = src || this.DEFAULT_SRC;
        }
        const this_ = this;
        this._new_texture = new Two.Texture(this.src, function() {
            const texture = this_._new_texture;
            this_.image.texture = texture;
            this_.width = texture.image.width;
            this_.height = texture.image.height;
            two.update();
        });
    }

    /* Set the background image and all room positions to the default. */
    resetBackground()
    {
        this.setBackground();
        this.rooms = this.DEFAULT_ROOMS.slice();
    }

    /* Clear all traps. */
    clearTraps()
    {
        this.root_group.remove(this.trap_group);
        this.trap_group = new Two.Group();
        this.root_group.add(this.trap_group);
        this.room_traps = new Map();
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
        const rg = this.root_group;
        return [(x - rg.position.x) / rg.scale,
                (y - rg.position.y) / rg.scale];
    }

    /* Convert background image coordinates to global (window) coordinates. */
    toGlobal(x, y)
    {
        const rg = this.root_group;
        return [x * rg.scale + rg.position.x,
                y * rg.scale + rg.position.y];
    }

    /* Return the current render scale of the map. */
    scale()
    {
        return this.root_group.scale;
    }

    /* Adjust the map position by the given global coordinate deltas. */
    adjustPosition(dx, dy)
    {
        this.root_group.position.x += dx;
        this.root_group.position.y += dy;
    }

    /* Adjust the map scale by the given factor, centered on the given
     * window coordinates. */
    adjustScale(factor, x, y)
    {
        const old_scale = this.root_group.scale;
        this.root_group.scale *= factor;
        // Also offset the image so we zoom in/out around the pointer position:
        //    (xy - pos1) / scale1 = (xy - pos2) / scale2
        //    (xy - pos1) * scale2 = (xy - pos2) * scale1
        //    xy*scale2 - pos1*scale2 = xy*scale1 - pos2*scale1
        //    pos2*scale1 = xy*scale1 - (xy*scale2 - pos1*scale2)
        //    pos2 = xy - ((xy*scale2 - pos1*scale2) / scale1)
        //    pos2 = xy - ((xy - pos1) * scale2 / scale1)
        const zoom = this.root_group.scale / old_scale;
        const new_x = x - ((x - this.root_group.position.x) * zoom);
        const new_y = y - ((y - this.root_group.position.y) * zoom);
        this.root_group.position.x = new_x;
        this.root_group.position.y = new_y;
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
                // Corner room, ignore.
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

    /* Return the center coordinates of the given room. */
    roomCenter(room)
    {
        const room_index = this._roomIndex(room);
        return this.rooms[room_index];
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
        this.trap_group.add(trap.icon);
        return trap;
    }

    /* Toggle trap index numbers on or off. */
    setTrapIndexVisible(visible)
    {
        this.forEachTrap(function(trap) {trap.setIndexVisible(visible)});
    }

    /* Toggle room/trap icon opacity depending on edit mode. */
    setEditRoomsMode(edit_rooms)
    {
        if (edit_rooms) {
            this.trap_group.opacity = 0.5;
            this.room_group.opacity = 1;
        } else {
            this.trap_group.opacity = 1;
            this.room_group.opacity = 0;
        }
    }

    /* Move the given room by the given amount (in background image
     * coordinates).  Traps associated with the room are moved by the
     * same amount. */
    moveRoom(room_id, dx, dy)
    {
        const room_index = this._roomIndex(room_id);
        this.rooms[room_index][0] += dx;
        this.rooms[room_index][1] += dy;
        const icon = this.room_icons.get(room_id);
        icon.position.x += dx;
        icon.position.y += dy;
        const traps = this.room_traps.get(room_id) || [];
        traps.forEach(function(trap) {
            trap.x += dx;
            trap.y += dy;
            trap.icon.position.x += dx;
            trap.icon.position.y += dy;
        });
    }

    /* Serialize map/trap data into a string. */
    serialize()
    {
        var data = {basePath: this.basePath, src: this.src, rooms: this.rooms,
                    traps: {}};
        this.room_traps.forEach(function(traps, room) {
            data.traps[room] = [];
            traps.forEach(function(trap) {
                data.traps[room].push({x: trap.room_x, y: trap.room_y,
                                       index: trap.index, color: trap.color});
            });
        });
        return JSON.stringify(data);
    }

    /* Deserialize map/trap data from a string. */
    deserialize(str)
    {
        const data = JSON.parse(str);
        this.clearTraps();
        if (data.basePath) {
            this.basePath = data.basePath;
        }
        this.setBackground(data.src);
        this.rooms = data.rooms;
        const this_ = this;
        for (var room in data.traps) {
            const [cx, cy] = this.roomCenter(room);
            var traps = [];
            data.traps[room].forEach(function(trap_data) {
                const {x, y, index, color} = trap_data;
                const trap = new Trap(x+cx, y+cy, x, y, index);
                trap.color = color;
                traps.push(trap);
                this_.trap_group.add(trap.icon);
            });
            this.room_traps.set(room, traps);
        }
        this._initRoomIcons();
    }

    /* Create icons for each room's center point (for editing).
     * Internal routine. */
    _initRoomIcons()
    {
        if (this.room_group) {
            this.root_group.remove(this.room_group);
        }
        this.room_icons = new Map();
        this.room_group = new Two.Group();
        this.root_group.add(this.room_group);
        this.room_group.opacity = 0;
        const this_ = this;
        this.rooms.forEach(function(center, i) {
            if ((i%5 == 0 || i%5 == 4) && (i < 10 || i >= 40)) {
                // Corner room, ignore.
            } else {
                const icon = new Two.Circle(center[0], center[1], 30, 32);
                icon.noStroke().fill = "rgba(255, 255, 255, 0.75)";
                var rx = i % 10;
                var ry = Math.trunc(i / 10);
                var prefix;
                if (rx >= 5) {
                    prefix = "B";
                    rx -= 5;
                } else {
                    prefix = "A";
                }
                const id = prefix + (ry+1) + (rx+1);
                this_.room_icons.set(id, icon);
                this_.room_group.add(icon);
            }
        });
    }

    /* Return the rooms[] index corresponding to the given room ID.
     * Internal routine. */
    _roomIndex(room)
    {
        const ab = room[0];
        const row = room[1];
        const col = room[2];
        console.assert(ab == "A" || ab == "B");
        console.assert(row >= "1" && row <= "5");
        console.assert(col >= "1" && col <= "5");
        return (row-1)*10 + (ab=="A" ? 0 : 5) + (col-1);
    }
}

////////////////////////////////////////////////////////////////////////
// Entry point

// Create base canvas.
const two = new Two({type: Two.Types.canvas,
                     fullscreen: true,
                     autostart: true});
two.appendTo(document.getElementById("container"));

// Initialize map and trap data.
const map = new TrapMap();
var map_pathname = null;

// Set up mouse tracking and related state.  We track both the current
// mouse position and the equivalent coordinates on the map image.
var mouse_x = two.width/2;
var mouse_y = two.height/2;
var bg_x = map.width/2;
var bg_y = map.height/2;
window.addEventListener("mousemove", onMouseMove);
window.addEventListener("mousedown", onMouseDown);
window.addEventListener("mouseup", onMouseUp);
window.addEventListener("wheel", onMouseWheel);
window.addEventListener("keypress", onKeyPress);

// Initialize editing state.
var show_indexes = false; // Show trap index numbers?
var mouse_trap = null;    // Trap over which the mouse is hovering
var clicked_trap = null;  // Trap which is currently grabbed
var click_x = 0;  // bg_[xy] at click time
var click_y = 0;
var edit_rooms = false;   // Editing room positions (true) or traps (false)?
var mouse_room = null;    // ID of room over which the mouse is hovering
var clicked_room = null;  // ID of room which is currently grabbed

// Prevent middle button paste on Linux when scrolling the map.
window.addEventListener("auxclick", function(e) {
    if (e.button == 1) e.preventDefault();
});

////////////////////////////////////////////////////////////////////////
// Input callbacks

function onMouseMove(e)
{
    const helpbox = document.getElementById("help");
    if (!helpbox.classList.contains("hidden")) {
        return;
    }

    mouse_x = e.clientX;
    mouse_y = e.clientY;
    [bg_x, bg_y] = map.fromGlobal(mouse_x, mouse_y);

    if (e.buttons & 4) {
        map.adjustPosition(e.movementX, e.movementY);
        two.update();
    }

    if (e.buttons & 1) {
        if (edit_rooms) {
            if (mouse_room) {
                map.moveRoom(mouse_room, e.movementX / map.scale(),
                                         e.movementY / map.scale());
                two.update();
            }
        } else {
            if (clicked_trap) {
                clicked_trap.icon.position.x += e.movementX / map.scale();
                clicked_trap.icon.position.y += e.movementY / map.scale();
                two.update();
            }
        }
    } else {
        if (edit_rooms) {
            var [room, rx, ry] = map.roomId(bg_x, bg_y, true);
            if (room) {
                const dist = distance2(bg_x, bg_y, rx, ry) ** 0.5;
                if (dist * map.scale() > 12) {
                    room = null;
                }
            }
            if (mouse_room != room) {
                if (mouse_room) {
                    map.room_icons.get(mouse_room).scale = 1;
                }
                if (room) {
                    map.room_icons.get(room).scale = 1.3;
                }
            }
            mouse_room = room;
        } else {
            var trap = map.getTrap(bg_x, bg_y);
            if (trap) {
                const dist = distance2(bg_x, bg_y, trap.x, trap.y) ** 0.5;
                if (dist * map.scale() > 12) {
                    trap = null;
                }
            }
            if (mouse_trap !== trap) {
                if (mouse_trap) {
                    mouse_trap.icon.scale = 1;
                }
                if (trap) {
                    trap.icon.scale = 1.3;
                }
            }
            mouse_trap = trap;
        }
    }
}

function onMouseDown(e)
{
    const helpbox = document.getElementById("help");
    if (!helpbox.classList.contains("hidden")) {
        helpbox.classList.add("hidden");
        return;
    }

    // Normally these will already be set by the mouse-move event, but if
    // the user clicks before ever moving the mouse, we need to initialize
    // these ourselves for proper trap placement.
    mouse_x = e.clientX;
    mouse_y = e.clientY;
    [bg_x, bg_y] = map.fromGlobal(mouse_x, mouse_y);

    if (e.button == 0) {
        if (!edit_rooms) {
            if (mouse_trap) {
                clicked_trap = mouse_trap;
            } else {
                clicked_trap = map.addTrap(bg_x, bg_y);
                clicked_trap.icon.scale = 1.3;
            }
            clicked_trap.icon.opacity = 0.4;
            two.update();
        }
        click_x = bg_x;
        click_y = bg_y;
    }
}

function onMouseUp(e)
{
    if (e.button == 0) {
        if (clicked_trap) {
            clicked_trap.icon.opacity = 1;
            two.update();
            clicked_trap.x += bg_x - click_x;
            clicked_trap.y += bg_y - click_y;
            clicked_trap.room_x += bg_x - click_x;
            clicked_trap.room_y += bg_y - click_y;
            mouse_trap = clicked_trap;
            clicked_trap = null;
        }
    }
}

function onMouseWheel(e)
{
    const helpbox = document.getElementById("help");
    if (!helpbox.classList.contains("hidden")) {
        return;
    }

    // HACK: Accesing e.deltaY before e.deltaMode seems to force Firefox to
    // always use PIXEL delta mode, so we do that here to avoid having to
    // deal with LINE mode (which reportedly no other browser uses anyway).
    const deltaY = e.deltaY;
    console.assert(e.deltaMode == WheelEvent.DOM_DELTA_PIXEL);
    map.adjustScale(2 ** (deltaY/-500), mouse_x, mouse_y);
    two.update();
}

function onKeyPress(e)
{
    const helpbox = document.getElementById("help");
    if (!helpbox.classList.contains("hidden")) {
        helpbox.classList.add("hidden");
        return;
    }

    if (e.key == "B") {  // shift-B
        map.clearTraps();
        map.setBackground(null);

    } else if (e.key == "L") {  // shift-L
        loadFile(function(pathname, data) {
            if (data === null) {
                if (pathname) {
                    alert("Failed to open file");
                } else {
                    alert("Operation cancelled");
                }
            } else {
                mouse_trap = null;
                clicked_trap = null;
                map.deserialize(data);
                map_pathname = pathname;
                edit_rooms = false;
                map.setEditRoomsMode(false);
            }
        });

    } else if (e.key == "M") {  // shift-M
        const bg_load = document.getElementById("bg_load");
        bg_load.onchange = function(e) {
            const file = bg_load.files[0];
            if (file) {
                map.setBackground(file.name, true);
            }
        };
        bg_load.click();

    } else if (e.key == "R") {  // shift-R
        if (!edit_rooms) {
            edit_rooms = true;
        } else {
            edit_rooms = false;
        }
        map.setEditRoomsMode(edit_rooms);

    } else if (e.key == "S") {  // shift-S
        saveFile(map.serialize(), map_pathname);

    } else if (e.key == "#") {
        show_indexes = !show_indexes;
        map.setTrapIndexVisible(show_indexes);

    } else if (e.key == "?") {
        helpbox.classList.remove("hidden");
    }
}

////////////////////////////////////////////////////////////////////////
