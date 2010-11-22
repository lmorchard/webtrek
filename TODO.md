# TODOs

## Soon

* Rate-adaptive update stream like wpilot
    * See wpilot/wpilots.js :: post_update and connection.update_rate
    * Per-entity update frame modulo, see Nodegame-Shooter
        * Players = 1-2, under non-deterministic control
        * Bullets = 10, every 10 frames since ballistic
* Collision detection!!!
* Radar panel in HUD
* Retroactive time adjustment for events to smooth things out
    * Stutter turning issue
* Don't render entity views that lie outside the viewport camera
* Don't get updates for entities outside viewport?

## Blue sky

* Dynamic viewport scaling related to speed
    * Zoom out with faster speed
* World-wide rules list like wpilot? per-entity sufficient?
* Use web workers to handle networking? viewport rendering?
* Sound effects!
* A theme song!
* Fancy particle effects (eg. engine exhaust?)

