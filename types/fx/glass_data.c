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

float glass_data_reach(const struct glass_data *glass) {
	// Through a squircle rim as thick as it is wide, the backdrop shifts by at
	// most 0.47 rim widths for refractive indices up to 1.55, and 0.52 up to 1.65.
	// A lens's rim can lie over the slab's, and then their shifts add.
	return (glass->bezel + glass->lens_bezel) * glass->refraction * 0.52f;
}
