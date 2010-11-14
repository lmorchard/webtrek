# TODOs

## Soon

* Track net stats, count bytes / messages / etc in server
    * HUD element showing readout
* Retroactive time adjustment for events to smooth things out
    * Stutter turning issue
* Combine messages into single periodic packets
    * See flush_queue()
* Rate-adaptive update stream like wpilot
    * See wpilot/wpilots.js :: post_update and connection.update_rate
    * See also conn.flush_queue
* Collision detection!!!
* Don't render entity views that lie outside the viewport camera
* Don't get updates for entities outside viewport?
* Require ping/pong between server/client at least every 2000ms

## Blue sky

* World-wide rules list like wpilot? per-entity sufficient?
* Use web workers to handle networking? viewport rendering?
* Sound effects!
* A theme song!
* Fancy particle effects (eg. engine exhaust?)
* A space background instead of a grid?
    * APoD?

