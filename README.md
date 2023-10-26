Deep Dungeon Trap Mapper
========================

An extremely simple mapping tool intended for recording locations and
screenshots of traps found in Final Fantasy XIV's Deep Dungeon content.


Usage
-----
**Preparation:**  Prepare a directory containing map background images
and trap screenshot images.  A single map background image should
contain the complete layout (42 rooms) for a single floorset; a generic
background image can be found in `data/default-bg.png`.  The image size
is assumed to be 4096x2048 pixels, but any image size should work (trap
icon sizes may not be ideal with other image sizes).

**Installation:**  Copy `trapmapper.html`, `trapmapper.js`, `style.css`,
and the `lib` subdirectory into the directory you prepared above.
Optionally, also copy the `data` subdirectory to provide a default map
background on startup.  `trapmapper.html` can be renamed to any other
name.

**Running:**  Open `trapmapper.html` (or whatever you renamed it to) in
a web browser.  Tested in Firefox, but should hopefully work in all
modern browsers.  Press the `?` key for a help window (press `?` again
to close).

**Creating a new map:**  Press `Shift+M` to select a map background
image to load.  (`Shift+M` can be used at any time to replace the
current map's background image and will not affect already-placed
traps.)  The map can be scrolled by dragging with the middle mouse
button pressed and can be zoomed with the scroll wheel.

**Setting room positions:**  Press `Shift+R` to enter room edit mode
(press `Shift+R` again to leave).  In room edit mode, a handle will be
displayed for each of the 42 rooms; the rooms are labeled with room IDs
like `A12` or `B53`, consisting of a left/right-side ID (A/B), row
number (1-5), and column number (1-5).  Drag each handle to the center
of the corresponding room.  These room designations are used to
associate traps with rooms and give each trap a unique index number
within the room. If traps have already been placed, dragging a room
handle will also move all traps associated with that room.

**Placing traps:**  Left-click anywhere to place a trap, then drag the
trap to the desired position.  A newly placed trap will get the first
free index number in that room (press `#` to toggle indexes on or off).
Already-placed traps can also be moved by dragging; if dragged into a
different room, the trap will get a new index based on the new room.

**Editing trap data:**  Middle-click a trap to edit its data.  Up to 3
trap screenshots and 1 hoard screenshot can be attached to a trap; when
hovering over a trap, the first trap screenshot (if any), otherwise the
hoard screenshot (if any), is shown in a pop-up.  Trap locations with
hoard screenshots attached are indicated with a yellow dot over the trap
icon; this can be toggled on and off with `Shift+Y`.  The trap index
number and icon color can also be changed, and the trap can also be
marked as a wall trap or conditional wall trap (in the case where a trap
is a wall trap only when the corridor to the next room is blocked off).

**Deleting traps:**  Click the "Delete trap" button while editing trap
data.  Note that there is **NO** confirmation before the trap is
deleted!

**Saving and loading:**  Press `Shift+S` to save the current map; the
browser will prompt you to save a `.json` file containing the map data
(but not any image data, only image filenames).  `Shift+L` can be used
to load a previously saved map.  Note that it is not possible to load a
map using (for example) a URL query parameter due to browser security
restrictions.

**Exporting the map image:**  Press `Shift+P` to export the current map
to a PNG file.  The image will be created at the same resolution as the
map background image.  The generated image will open in a new browser
window (or tab, depending on your browser settings); you may need to set
your browser to allow pop-up windows for this to work.


Caveats
-------
There is **NO** undo feature.

There are **NO** unsaved data warnings; the app will happily erase all
your hard work if you press `Shift+B` or close the window without
saving.  Consider using a Git repository or similar to manage the JSON
files in case of bugs or other accidental data loss.


Planned features
----------------
None.  This is an extremely simple tool built for a particular purpose,
and I have no further plans for it.  If you want to extend it on your
own, feel free.


License/Warranty
----------------
Public domain, share and enjoy.  If it blows up in your face, you get to
keep all the pieces.

two.js has its own license; see lib/two/LICENSE for details.
