#include <math.h>

#include "scenefx/types/fx/glass_data.h"

struct glass_data glass_data_get_default(void) {
	return (struct glass_data) {
		.bezel = 22,
		.refraction = 1.6,
		.dispersion = 0.04,
		.specular = 0.7,
		.light_angle = 315,
		.dim = 0.15,
		.clarity = 0.5,
		.tint = {0.1, 0.1, 0.12, 0.08},
		// A smoked lens, its rim wide enough that the bend shows
		.lens_bezel = 12,
		.lens_tint = {0.08, 0.08, 0.1, 0.24},
	};
}

// The largest shift through a rim `bezel` wide on a box `width` by `height`,
// whose rim, as in the shader, is at most half the box's shorter side.
// Through a squircle rim as thick as it is wide, the backdrop shifts by at
// most 0.47 rim widths for refractive indices up to 1.55, and 0.52 up to 1.65;
// the shader's largest index is 1.5 plus the dispersion.
static float rim_reach(const struct glass_data *glass, float bezel, float width, float height) {
	float rim = fminf(bezel, fminf(width, height) / 2);
	return fmaxf(rim, 0) * glass->refraction * (glass->dispersion <= 0.05f ? 0.47f : 0.52f);
}

float glass_data_reach(const struct glass_data *glass, float scale, float width, float height,
		float lens_width, float lens_height) {
	float reach = rim_reach(glass, glass->bezel * scale, width, height);
	if (lens_width > 0 && lens_height > 0) {
		// A lens's rim can lie over the slab's, and then their shifts add
		reach += rim_reach(glass, glass->lens_bezel * scale, lens_width, lens_height);
	}
	return reach;
}
