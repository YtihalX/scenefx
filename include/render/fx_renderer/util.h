#ifndef _FX_UTIL_H
#define _FX_UTIL_H

#include <pixman.h>
#include <stdbool.h>
#include <stdlib.h>
#include <wlr/backend/interface.h>

bool open_preferred_drm_fd(struct wlr_backend *backend, int *drm_fd_ptr,
		bool *own_drm_fd);

/**
 * Writes a line for a region of glass work to stderr, for MANGO_DEBUG_GLASS:
 * "glass WHAT AREA X1,Y1,X2,Y2;..." in buffer pixels, `what` being a frame's
 * damage, the damage blur adds to it (added), the region a glass draw
 * presents, or the region its blur works over.
 */
void fx_debug_glass_region(const char *what, const pixman_region32_t *region);

#endif
