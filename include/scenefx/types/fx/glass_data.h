#ifndef TYPES_FX_GLASS_DATA_H
#define TYPES_FX_GLASS_DATA_H

/*
 * Liquid glass: a blur node turned into a slab of glass whose rim refracts,
 * fringes and catches the light (see wlr_scene_blur_set_glass). The slab is
 * the node's rounded box; across its rim the top surface rises as a convex
 * squircle, inside the rim it is flat. A lens is a second glass set into the
 * slab (see wlr_scene_blur_set_glass_lens), with its own tint and a narrower
 * rim of the same shape. Lengths are logical pixels.
 */
struct glass_data {
	float bezel; // width of the curved rim, also the slab's thickness
	float refraction; // multiplier on the physical displacement through the rim
	float dispersion; // refractive index spread between red and blue
	float specular; // brightness of the edge highlight, 0..1
	float light_angle; // where the light comes from, degrees clockwise from the top
	float dim; // darkening of bright backdrops, 0..1, keeps light text legible
	float clarity; // how much of the unblurred backdrop the middle shows: 0 frosted, 1 clear
	float tint[4]; // straight-alpha RGBA mixed over the backdrop
	float lens_bezel; // width of a lens's rim
	float lens_tint[4]; // straight-alpha RGBA mixed over the backdrop inside a lens
};

struct glass_data glass_data_get_default(void);

/*
 * How far from itself glass `width` by `height` samples its backdrop: as far
 * as its rim refracts and, with a lens `lens_width` by `lens_height` set into
 * it (0 by 0 for none), the lens's rim too. Sizes, and the result, are in
 * pixels `scale` to a logical pixel.
 */
float glass_data_reach(const struct glass_data *glass, float scale, float width, float height,
		float lens_width, float lens_height);

#endif
