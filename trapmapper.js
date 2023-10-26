import Two from "./lib/two/src/two.js";

////////////////////////////////////////////////////////////////////////
// Miscellaneous utility routines

/* Return the squared distance between the two given points. */
function distance2(x1, y1, x2, y2)
{
    return (x2-x1)**2 + (y2-y1)**2;
}


/* Set the size of an <IMG> element to a width `width_ratio` (e.g. 0.2) of
 * the screen width and a height assuming a 16:9 aspect ratio. */
function setImageSize(img, width_ratio)
{
    img.width = two.width * width_ratio;
    img.height = img.width * (9/16);
}


/* Refresh the contents of the edit box for the given trap. */
function refreshEditBox(trap)
{
    for (var i = 0; i < 3; i++) {
        if (i < trap.images.length) {
            dom_edit_image[i].classList.remove("hidden");
            dom_edit_image_img[i].src = map.basePath + trap.images[i];
        } else {
            dom_edit_image[i].classList.add("hidden");
        }
    }
    if (trap.images.length < 3) {
        dom_edit_image_add_holder.classList.remove("hidden");
    } else {
        dom_edit_image_add_holder.classList.add("hidden");
    }

    if (trap.hoard) {
        dom_edit_hoard.classList.remove("hidden");
        dom_edit_hoard_img.src = map.basePath + trap.hoard;
        dom_edit_hoard_add_holder.classList.add("hidden");
    } else {
        dom_edit_hoard.classList.add("hidden");
        dom_edit_hoard_add_holder.classList.remove("hidden");
    }

    dom_edit_index.value = trap.index;

    for (var i = 0; i < dom_edit_color.length; i++) {
        if (i == trap.color) {
            dom_edit_color[i].classList.add("selected");
        } else {
            dom_edit_color[i].classList.remove("selected");
        }
    }

    dom_edit_wall.checked = edit_trap.wall_trap;
    dom_edit_wall.indeterminate = edit_trap.wall_closed;
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
    // FIXME: If we use the precreated <a> element, Firefox tries to save the
    // file again every time we trigger the img_load element - browser bug?
    // Use a temporary element as a workaround
    //const fs_save = document.getElementById("fs_save");
    const fs_save = document.createElement("a"); document.getElementById("hidden").appendChild(fs_save);
    const file = new File([data], "", {type: "text/plain"});
    fs_save.href = window.URL.createObjectURL(file);
    fs_save.setAttribute("download", pathname || "map.json");
    fs_save.click();
    // FIXME: as above
    document.getElementById("hidden").removeChild(fs_save);
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
    /* Trap images (image filename strings) */
    images = [];
    /* Hoard image (image filename string), null if none */
    hoard = null;
    /* Is this a wall trap? */
    wall_trap = false;
    /* Is this only a wall trap if the wall is closed?  (always false if
     * wall_trap is false) */
    wall_closed = false;

    /* Trap icon (Two.Shape) */
    icon = null;
    /* Hoard icon (Two.Shape) */
    icon_hoard = null;
    /* Index overlay (Two.Shape) */
    icon_index = null;

    /* Base trap icon (internal) */
    _icon_base = null;
    /* Wall-closed trap indicator (internal) */
    _icon_wall = null;

    constructor(x, y, room_x, room_y, index)
    {
        this.x = x;
        this.y = y;
        this.room_x = room_x;
        this.room_y = room_y;
        this.index = index;

        this._icon_base = new Two.Circle(0, 0, this.iconSize(), 32);
        this._icon_base.fill = window.getComputedStyle(dom_edit_color[0]).getPropertyValue("background-color");
        this._icon_base.stroke = "rgb(0, 0, 0, 0.25)";
        this._icon_base.linewidth = 0.5;
        this._icon_base.opacity = 0.5;
        this._icon_wall = new Two.Circle(0, 0, 10, 32);
        this._icon_wall.noFill().stroke = "rgb(0, 0, 0)";
        this._icon_wall.linewidth = 2.5;
        this._icon_wall.opacity = 0;
        this.icon = new Two.Group(this._icon_base, this._icon_wall);
        this.icon_hoard = new Two.Circle(0, 0, 3, 32);
        this.icon_hoard.noStroke().fill = "rgba(255, 255, 0, 1.0)";
        this.icon_hoard.opacity = 0;
        this.icon_index = new Two.Text(this.index, 0, 1);
        this.icon_index.family = window.getComputedStyle(document.querySelector("body")).getPropertyValue("font-family");
        this.icon_index.weight = 700;
        this.icon_index.size = 15;
        this.icon_index.fill = "rgba(255, 255, 255, 1.0)";
        this.icon_index.stroke = "rgba(0, 0, 0, 1.0)";

        this.icon.position.x = x;
        this.icon.position.y = y;
        this.icon_hoard.position.x = x;
        this.icon_hoard.position.y = y;
        this.icon_index.position.x = x;
        this.icon_index.position.y = y+1;
    }

    /* Return the radius of the icon, in background image coordinates. */
    iconSize()
    {
        return this.wall_trap ? 15 : 8;
    }

    /* Set whether to display the icon in "hover" state (enlarged). */
    setHover(hover)
    {
        this.icon.scale = hover ? 1.3 : 1.0;
        this.icon_hoard.scale = hover ? 1.3 : 1.0;
        this.icon_index.scale = hover ? 1.3 : 1.0;
    }

    /* Set whether to display the icon in "drag" state (translucent). */
    setDrag(drag)
    {
        this.icon.opacity = drag ? 0.4 : 1.0;
    }

    /* Move trap by the given amount, in background image coordinates. */
    move(dx, dy)
    {
        this.x += dx;
        this.y += dy;
        this.room_x += dx;
        this.room_y += dy;
        this.icon.position.x = this.x;
        this.icon.position.y = this.y;
        this.icon_hoard.position.x = this.x;
        this.icon_hoard.position.y = this.y;
        this.icon_index.position.x = this.x;
        this.icon_index.position.y = this.y+1;
    }

    /* Add a trap image.  Updates the trap icon if this is the first image. */
    addImage(filename)
    {
        this.images.push(filename);
        this._icon_base.opacity = 1.0;
    }

    /* Delete a trap image.  Updates the trap icon if no images are left. */
    deleteImage(index)
    {
        console.assert(index >= 0);
        console.assert(index < this.images.length);
        this.images.splice(index, 1);
        if (this.images.length == 0) {
            this._icon_base.opacity = 0.5;
        }
    }

    /* Set the hoard image (null to clear any previously set image).
     * Updates the hoard icon appropriately. */
    setHoard(filename)
    {
        this.hoard = filename;
        this.icon_hoard.opacity = filename ? 1.0 : 0.0;
    }

    /* Set the numeric index for this trap.  Updates the icon appropriately. */
    setIndex(index)
    {
        this.index = index;
        this.icon_index.value = index;
    }

    /* Set the color (0-4) for this trap.  Updates the icon appropriately. */
    setColor(color)
    {
        this.color = color;
        this._icon_base.fill = window.getComputedStyle(dom_edit_color[color]).getPropertyValue("background-color");
    }

    /* Set whether this is a wall trap.  Possible value combinations:
     *    false, false = not a wall trap
     *    true, false  = always a wall trap
     *    true, true   = wall trap when the wall is closed
     * Updates the icon appropriately. */
    setWallTrap(wall_trap, wall_closed)
    {
        this.wall_trap = wall_trap;
        this.wall_closed = wall_trap && wall_closed;
        this._icon_base.radius = this.iconSize();
        this._icon_wall.opacity = this.wall_closed ? 1.0 : 0.0;
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
    /* Image size (for convenience) */
    width = 0;
    height = 0;
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
    /* Should the index icons be displayed? */
    indexes_visible = false;
    /* Trap which is currently in hover state (null if none) */
    hover_trap = null;
    /* Index in icon group child arrays of hover_trap's icons, for
     * Z-reordering.  (This is apparently the sanctioned way to manipulate
     * rendering order; see <https://github.com/jonobr1/two.js/issues/245>) */
    hover_trap_index = -1;

    /* Two.Group encapsulating all graphic objects (for scrolling/zooming) */
    root_group = null;
    /* Image (Two.Sprite) instance */
    image = null;
    /* Two.Group containing trap icons */
    trap_group = null;
    /* Two.Group containing hoard icons */
    hoard_group = null;
    /* Two.Group containing trap index icons */
    index_group = null;
    /* List of room center icons, indexed by room ID */
    room_icons = new Map();
    /* Two.Group containing room center icons */
    room_group = null;

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
        this.hoard_group = new Two.Group();
        this.index_group = new Two.Group();
        this.index_group.opacity = 0.0;
        this.root_group.add(this.trap_group, this.hoard_group,
                            this.index_group);
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
        this.root_group.remove(this.hoard_group);
        this.root_group.remove(this.index_group);
        this.trap_group = new Two.Group();
        this.hoard_group = new Two.Group();
        this.index_group = new Two.Group();
        this.index_group.opacity = this.indexes_visible ? 1.0 : 0.0;
        this.root_group.add(this.trap_group, this.hoard_group,
                            this.index_group);
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
        const [traps, index] = this._getTrapIndex(room);
        const trap = new Trap(x, y, x-room_x, y-room_y, index);
        traps.push(trap);
        this.trap_group.add(trap.icon);
        this.hoard_group.add(trap.icon_hoard);
        this.index_group.add(trap.icon_index);
        return trap;
    }

    /* Set the index for the given trap.  If another trap in the same room
     * already has that index, swap it with the given trap. */
    setTrapIndex(trap, index)
    {
        const [room, list_index] = this._findTrap(trap);
        const traps = this.room_traps.get(room);
        for (var i = 0; i < traps.length; i++) {
            if (traps[i] !== trap && traps[i].index == index) {
                traps[i].setIndex(trap.index);
                break;
            }
        }
        trap.setIndex(index);
    }

    /* Reassign the given trap to the nearest room.  Should be called
     * after moving a trap to a new position. */
    rePlaceTrap(trap)
    {
        const [old_room, old_index] = this._findTrap(trap);
        const [new_room, room_x, room_y] = this.roomId(trap.x, trap.y, true);
        if (new_room == old_room) {
            return;
        }
        this.room_traps.get(old_room).splice(old_index, 1);
        const [traps, trap_index] = this._getTrapIndex(new_room);
        trap.room_x = room_x;
        trap.room_y = room_y;
        trap.setIndex(trap_index);
        traps.push(trap);
    }

    /* Remove the given trap. */
    removeTrap(trap)
    {
        const [room, index] = this._findTrap(trap);
        this.room_traps.get(room).splice(index, 1);
        this.trap_group.remove(trap.icon);
        this.hoard_group.remove(trap.icon_hoard);
        this.index_group.remove(trap.icon_index);
        if (this.hover_trap === trap) {
            this.hover_trap = null;
        }
    }

    /* Mark the given trap as in "hover" state (enlarged and placed on top
     * of all others).  Pass null to clear any currently hovered trap. */
    setHoverTrap(trap)
    {
        if (this.hover_trap) {
            this.hover_trap.setHover(false);
            this.trap_group.remove(this.hover_trap.icon);
            this.hoard_group.remove(this.hover_trap.icon_hoard);
            this.index_group.remove(this.hover_trap.icon_index);
            this.trap_group.children.splice(this.hover_trap_index, 0,
                                            this.hover_trap.icon);
            this.hoard_group.children.splice(this.hover_trap_index, 0,
                                             this.hover_trap.icon_hoard);
            this.index_group.children.splice(this.hover_trap_index, 0,
                                             this.hover_trap.icon_index);
        }
        this.hover_trap = trap;
        if (trap) {
            trap.setHover(true);
            this.hover_trap_index = this.trap_group.children.indexOf(trap.icon);
            console.assert(this.hover_trap_index >= 0);
            this.trap_group.remove(trap.icon);
            this.hoard_group.remove(trap.icon_hoard);
            this.index_group.remove(trap.icon_index);
            this.trap_group.add(trap.icon);  // added to end, i.e. on top
            this.hoard_group.add(trap.icon_hoard);
            this.index_group.add(trap.icon_index);
        }
    }

    /* Toggle trap index numbers on or off. */
    setTrapIndexVisible(visible)
    {
        this.indexes_visible = visible;
        this.index_group.opacity = visible ? 1.0 : 0.0;
    }

    /* Toggle room/trap icon opacity depending on edit mode. */
    setEditRoomsMode(edit_rooms)
    {
        if (edit_rooms) {
            this.trap_group.opacity = 0.5;
            this.hoard_group.opacity = 0.5;
            this.index_group.opacity = this.indexes_visible ? 0.5 : 0.0;
            this.room_group.opacity = 1.0;
        } else {
            this.trap_group.opacity = 1.0;
            this.hoard_group.opacity = 1.0;
            this.index_group.opacity = this.indexes_visible ? 1.0 : 0.0;
            this.room_group.opacity = 0.0;
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
                                       index: trap.index, color: trap.color,
                                       images: trap.images, hoard: trap.hoard,
                                       wall_trap: trap.wall_trap,
                                       wall_closed: trap.wall_closed});
            });
        });
        return JSON.stringify(data, null, 2);
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
                const {x, y, index, color, images, hoard,
                       wall_trap, wall_closed} = trap_data;
                const trap = new Trap(x+cx, y+cy, x, y, index);
                images.forEach(function(image) {trap.addImage(image);});
                trap.setHoard(hoard);
                trap.setColor(color);
                trap.setWallTrap(wall_trap, wall_closed);
                traps.push(trap);
                this_.trap_group.add(trap.icon);
                this_.hoard_group.add(trap.icon_hoard);
                this_.index_group.add(trap.icon_index);
            });
            this.room_traps.set(room, traps);
            // Ensure all trap indexes are valid
            traps.forEach(function(trap) {
                var index = trap.index - 0;  // Force to numeric type
                if (isNaN(index)) {
                    index = this_._getTrapIndex(room)[1];
                }
                trap.setIndex(index);
            });
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
                const icon = new Two.Circle(0, 0, 30, 32);
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
                const label = new Two.Text(id, 0, 1);
                label.family = window.getComputedStyle(document.querySelector("body")).getPropertyValue("font-family");
                label.weight = 700;
                label.size = 25;
                label.noStroke().fill = "rgba(0, 0, 0, 1.0)";
                const group = new Two.Group(icon, label);
                group.position.x = center[0];
                group.position.y = center[1];
                this_.room_icons.set(id, group);
                this_.room_group.add(group);
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

    /* Return the room containing the given trap and the trap's index
     * in the room's trap array.  The trap is assumed to be in the list.
     * Internal routine. */
    _findTrap(trap)
    {
        var room = null;
        var index = null;
        this.room_traps.forEach(function(traps, r) {
            const i = traps.indexOf(trap);
            if (i >= 0) {
                console.assert(room == null);
                room = r;
                index = i;
            }
        });
        console.assert(room != null);
        return [room, index];
    }

    /* Return the first unused trap index for the given room.  Also
     * returns the room's trap array (initialized to an empty array if
     * necessary) for convenience.  Internal routine. */
    _getTrapIndex(room)
    {
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
        return [traps, index];
    }
}

////////////////////////////////////////////////////////////////////////
// Entry point

// Look up various HTML elements.
const dom_container = document.getElementById("container");
const dom_helpbox = document.getElementById("help");
const dom_popup_image = document.getElementById("popup_image");
const dom_popup_image_img = document.getElementById("popup_image_img");
const dom_editbox = document.getElementById("edit");
const dom_edit_image = [document.getElementById("edit_image1"),
                        document.getElementById("edit_image2"),
                        document.getElementById("edit_image3")];
const dom_edit_image_img = [document.getElementById("edit_image1_img"),
                            document.getElementById("edit_image2_img"),
                            document.getElementById("edit_image3_img")];
const dom_edit_image_add_holder = document.getElementById("edit_image_add_holder");
const dom_edit_hoard = document.getElementById("edit_hoard");
const dom_edit_hoard_img = document.getElementById("edit_hoard_img");
const dom_edit_hoard_add_holder = document.getElementById("edit_hoard_add_holder");
const dom_edit_index = document.getElementById("edit_index");
const dom_edit_color = [document.getElementById("edit_color1"),
                        document.getElementById("edit_color2"),
                        document.getElementById("edit_color3"),
                        document.getElementById("edit_color4"),
                        document.getElementById("edit_color5")];
const dom_edit_wall = document.getElementById("edit_wall");
const dom_img_load = document.getElementById("img_load");

// Create base canvas.
const two = new Two({type: Two.Types.canvas,
                     fullscreen: true});
two.appendTo(dom_container);
two.addEventListener("resize", function() {two.render();});

// Configure various element sizes based on the canvas size.
setImageSize(dom_popup_image_img, 1/3);
dom_edit_image_img.forEach(function(elem) {setImageSize(elem, 0.2);});
setImageSize(dom_edit_hoard_img, 0.2);

// Initialize map and trap data.
const map = new TrapMap();
var map_pathname = null;

// Set up mouse tracking and related state.  We track both the current
// mouse position and the equivalent coordinates on the map image.
var mouse_x = two.width/2;
var mouse_y = two.height/2;
var bg_x = map.width/2;
var bg_y = map.height/2;
var mclick_x;   // Coordinates of middle-mouse-button-down event
var mclick_y;
var mclick_ts;  // Timestamp of MMB-down event (for click/drag detection)
window.addEventListener("mousemove", onMouseMove);
window.addEventListener("mousedown", onMouseDown);
window.addEventListener("mouseup", onMouseUp);
window.addEventListener("wheel", onMouseWheel);

// Set up other input event handlers.
window.addEventListener("keypress", onKeyPress);
for (var i = 0; i < dom_edit_image.length; i++) {
    const i_ = i;
    document.getElementById("edit_image"+(i+1)+"_delete").addEventListener("click", function(e) {onDeleteTrapImage(i_, e);});
}
document.getElementById("edit_image_add").addEventListener("click", onAddTrapImage);
document.getElementById("edit_hoard_delete").addEventListener("click", onDeleteHoardImage);
document.getElementById("edit_hoard_add").addEventListener("click", onAddHoardImage);
dom_edit_index.addEventListener("change", onSetTrapIndex);
for (var i = 0; i < dom_edit_color.length; i++) {
    const i_ = i;
    dom_edit_color[i].addEventListener("click", function(e) {onSetColor(i_, e);});
}
dom_edit_wall.addEventListener("change", onSetWallTrap);
document.getElementById("edit_delete").addEventListener("click", onDeleteTrap);

// Initialize editing state.
var show_indexes = false; // Show trap index numbers?
var mouse_trap = null;    // Trap over which the mouse is hovering
var clicked_trap = null;  // Trap which is currently grabbed
var edit_trap = null;     // Trap which is being edited
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
    mouse_x = e.clientX;
    mouse_y = e.clientY;
    [bg_x, bg_y] = map.fromGlobal(mouse_x, mouse_y);

    if (!dom_helpbox.classList.contains("hidden")) {
        return;
    }
    if (edit_trap) {
        return;
    }

    if (e.buttons & 4) {
        map.adjustPosition(e.movementX, e.movementY);
        two.update();
        if (mclick_ts) {
            const drag_epsilon = 5;
            const limit2 = drag_epsilon * drag_epsilon;
            if (distance2(mclick_x, mclick_y, mouse_x, mouse_y) > limit2) {
                mclick_ts = null;
            }
        }
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
                clicked_trap.move(e.movementX / map.scale(),
                                  e.movementY / map.scale());
                two.update();
            }
        }
    } else {
        if (edit_rooms) {
            var [room, rx, ry] = map.roomId(bg_x, bg_y, true);
            if (room) {
                const dist = distance2(bg_x, bg_y, rx, ry) ** 0.5;
                if (dist > 30*1.3 + 5/map.scale()) {
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
                two.update();
            }
            mouse_room = room;
        } else {
            var trap = map.getTrap(bg_x, bg_y);
            if (trap) {
                const dist = distance2(bg_x, bg_y, trap.x, trap.y) ** 0.5;
                if (dist > trap.iconSize()*1.3 + 5/map.scale()) {
                    trap = null;
                }
            }
            if (mouse_trap !== trap) {
                if (mouse_trap) {
                    dom_popup_image.classList.add("hidden");
                }
                map.setHoverTrap(trap);
                if (trap) {
                    var image;
                    if (trap.images.length) {
                        image = map.basePath + trap.images[0];
                    } else if (trap.hoard) {
                        image = map.basePath + trap.hoard;
                    } else {
                        image = null;
                    }
                    if (image) {
                        dom_popup_image_img.src = image;
                        const [tx, ty] = map.toGlobal(trap.x, trap.y);
                        const offset = (trap.iconSize()*1.3 * map.scale()) + 5;
                        var left, top;
                        if (tx+offset > two.width*0.6) {
                            left = tx - offset - (dom_popup_image_img.width + 4);
                        } else {
                            left = tx + offset;
                        }
                        if (ty+offset > two.height*0.6) {
                            top = ty - (dom_popup_image_img.height + 4);
                        } else {
                            top = ty;
                        }
                        dom_popup_image.style.left = left + "px";
                        dom_popup_image.style.top = top + "px";
                        dom_popup_image.classList.remove("hidden");
                    }
                }
                two.update();
            }
            mouse_trap = trap;
        }
    }
}


function onMouseDown(e)
{
    // Normally these will already be set by the mouse-move event, but if
    // the user clicks before ever moving the mouse, we need to initialize
    // these ourselves for proper trap placement.  (But watch out for
    // invalid data, as appears to happen when clicking on a <select>
    // dropdown.)
    if (e.clientX == 0 && e.clientY == 0) {
        return;
    }
    mouse_x = e.clientX;
    mouse_y = e.clientY;
    [bg_x, bg_y] = map.fromGlobal(mouse_x, mouse_y);

    if (!dom_helpbox.classList.contains("hidden")) {
        dom_helpbox.classList.add("hidden");
        return;
    }

    if (edit_trap) {
        const edit_rect = dom_editbox.getBoundingClientRect();
        if (mouse_x < edit_rect.left || mouse_x > edit_rect.right
         || mouse_y < edit_rect.top || mouse_y > edit_rect.bottom) {
            // Index dropdown could extend outside the box.
            const index_rect = dom_edit_index.getBoundingClientRect();
            if (mouse_x < index_rect.left || mouse_x > index_rect.right
             || mouse_y < index_rect.top || mouse_y > index_rect.bottom) {
                dom_editbox.classList.add("hidden");
                map.setHoverTrap(null);
                two.update();
                edit_trap = null;
            }
        }
        return;
    }

    if (e.button == 0) {
        if (!edit_rooms) {
            if (mouse_trap) {
                dom_popup_image.classList.add("hidden");
                clicked_trap = mouse_trap;
            } else {
                clicked_trap = map.addTrap(bg_x, bg_y);
                map.setHoverTrap(clicked_trap);
            }
            clicked_trap.setDrag(true);
            two.update();
        }

    } else if (e.button == 1) {
        if (!edit_rooms && !edit_trap && mouse_trap) {
            mclick_x = mouse_x;
            mclick_y = mouse_y;
            mclick_ts = Date.now();
        }
    }
}


function onMouseUp(e)
{
    if (edit_trap) {
        return;
    }

    if (e.button == 0) {
        if (clicked_trap) {
            clicked_trap.setDrag(false);
            map.rePlaceTrap(clicked_trap);
            two.update();
            mouse_trap = clicked_trap;
            clicked_trap = null;
        }

    } else if (e.button == 1) {
        if (mclick_ts && Date.now() - mclick_ts < 300) {
            dom_popup_image.classList.add("hidden");
            edit_trap = mouse_trap;
            refreshEditBox(edit_trap);
            dom_editbox.classList.remove("hidden");
        }
    }
}


function onMouseWheel(e)
{
    if (!dom_helpbox.classList.contains("hidden")) {
        return;
    }
    if (edit_trap) {
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
    if (!dom_helpbox.classList.contains("hidden")) {
        dom_helpbox.classList.add("hidden");
        return;
    } else if (e.key == "?") {
        dom_helpbox.classList.remove("hidden");
        return;
    }

    if (edit_trap) {
        return;
    }

    if (e.key == "B") {  // shift-B
        map.clearTraps();
        map.setBackground(null);
        map_pathname = "";
        edit_rooms = false;
        map.setEditRoomsMode(false);
        two.update();

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
                two.update();
            }
        });

    } else if (e.key == "M") {  // shift-M
        dom_img_load.onchange = function(e) {
            const file = dom_img_load.files[0];
            if (file) {
                map.setBackground(file.name, true);
            }
        };
        dom_img_load.click();

    } else if (e.key == "R") {  // shift-R
        if (!edit_rooms) {
            edit_rooms = true;
        } else {
            edit_rooms = false;
        }
        map.setEditRoomsMode(edit_rooms);
        two.update();

    } else if (e.key == "S") {  // shift-S
        saveFile(map.serialize(), map_pathname);

    } else if (e.key == "#") {
        show_indexes = !show_indexes;
        map.setTrapIndexVisible(show_indexes);
        two.update();
    }
}


function onAddTrapImage(e)
{
    dom_img_load.onchange = function(e) {
        const file = dom_img_load.files[0];
        if (file) {
            edit_trap.addImage(file.name);
            refreshEditBox(edit_trap);
        }
    };
    dom_img_load.click();
}


function onDeleteTrapImage(index, e)
{
    edit_trap.deleteImage(index);
    refreshEditBox(edit_trap);
}


function onAddHoardImage(e)
{
    dom_img_load.onchange = function(e) {
        const file = dom_img_load.files[0];
        if (file) {
            edit_trap.setHoard(file.name);
            refreshEditBox(edit_trap);
        }
    };
    dom_img_load.click();
}


function onDeleteHoardImage(e)
{
    edit_trap.setHoard(null);
    refreshEditBox(edit_trap);
}


function onSetTrapIndex(e)
{
    const index = dom_edit_index.value;
    if (index != edit_trap.index) {
        const index = dom_edit_index.value - 0;  // Force to numeric type
        map.setTrapIndex(edit_trap, index);
    }
}


function onSetColor(color, e)
{
    edit_trap.setColor(color);
    refreshEditBox(edit_trap);
}


function onSetWallTrap(e)
{
    if (edit_trap.wall_closed) {
        edit_trap.setWallTrap(false, false);
    } else if (edit_trap.wall_trap) {
        edit_trap.setWallTrap(true, true);
    } else {
        edit_trap.setWallTrap(true, false);
    }
    refreshEditBox(edit_trap);
}


function onDeleteTrap(e)
{
    map.removeTrap(edit_trap);
    dom_editbox.classList.add("hidden");
    edit_trap = null;
}

////////////////////////////////////////////////////////////////////////
