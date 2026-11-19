// Liquid glass: the backdrop seen through a slab of glass with a convex rim.
//
// The slab is a rounded box. Across its rim, the outer `bezel` pixels, the top
// surface rises as a squircle, h^4 = 1 - (1 - x)^4, to a thickness equal to
// the rim's width; inside the rim it is flat. A ray from the viewer refracts at
// that surface and lands on the backdrop further in, so the rim shows the
// backdrop pulled towards the middle, most strongly just inside the edge. Red
// and blue refract with slightly different indices, which fringes the rim.
// The rim shows the backdrop unblurred, so the lensing stays crisp; the flat
// middle shows it frosted, or as clear as `clarity` asks. Light makes
// a thin line along the edge, brightest where the edge faces the light and
// again, weaker, on the opposite side; the steep outer rim brightens as glass
// reflects more at grazing angles; a soft glow sits inside the lit edge.
//
// A lens is a second glass set into the slab: a smaller rounded box with its
// own tint and a rim `lens_bezel` wide of the same shape, so the backdrop
// bends where the two glasses meet, and its edge catches the light too. It is
// cut off outside its clip box, like a row scrolled partly out of a list.

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 v_texcoord;

uniform sampler2D tex; // blurred backdrop, one texel per framebuffer pixel
uniform sampler2D sharp; // the same backdrop, unblurred
uniform vec2 tex_size;
uniform vec2 position; // glass box in framebuffer pixels
uniform vec2 size;
uniform vec4 radius; // top-left, top-right, bottom-left, bottom-right
uniform float bezel;
uniform float refraction;
uniform float dispersion;
uniform float specular;
uniform vec2 light; // unit vector towards the light
uniform float dim;
uniform float clarity; // how much of the unblurred backdrop the middle shows, 0..1
uniform vec4 tint; // straight alpha
uniform float alpha;
uniform float scale; // framebuffer pixels per logical pixel
uniform vec2 lens_position; // lens box in framebuffer pixels; zero size for none
uniform vec2 lens_size;
uniform float lens_radius;
uniform float lens_bezel;
uniform vec4 lens_tint; // straight alpha
uniform vec4 lens_clip; // x, y, width, height in framebuffer pixels; zero size for none

const float IOR = 1.5;

// Signed distance to a rounded box centred on the origin, negative inside,
// and the direction out of the box.
float box_distance(vec2 p, vec2 half_size, float r, out vec2 outward) {
	vec2 side = vec2(p.x < 0.0 ? -1.0 : 1.0, p.y < 0.0 ? -1.0 : 1.0);
	vec2 q = abs(p) - half_size + r;
	if (q.x > 0.0 && q.y > 0.0) {
		outward = side * normalize(q);
		return length(q) - r;
	}
	outward = q.x > q.y ? vec2(side.x, 0.0) : vec2(0.0, side.y);
	return max(q.x, q.y) - r;
}

// Slope of the rim's surface at rim position x: 0 at the edge, 1 where the rim
// meets the flat top. The slab is as thick as the rim is wide.
float rim_slope(float x) {
	float u = 1.0 - x;
	return u * u * u * pow(1.0 - u * u * u * u, -0.75);
}

// How far inwards the backdrop seen at rim position x lies, in slab thicknesses.
float rim_shift(float x, float slope, float ior) {
	float u = 1.0 - x;
	float height = pow(1.0 - u * u * u * u, 0.25);
	vec3 ray = refract(vec3(0.0, 0.0, -1.0), normalize(vec3(slope, 0.0, 1.0)), 1.0 / ior);
	return ray.x / ray.z * height;
}

// Through a rim `rim` wide, at `depth` into it: pulls where each colour sees
// the backdrop inwards, and raises how clearly the backdrop shows and how
// much the steep rim reflects.
void through_rim(float depth, float rim, vec2 outward, inout vec2 shift_r, inout vec2 shift_g,
		inout vec2 shift_b, inout float clear, inout float fresnel) {
	float x = max(depth / rim, 0.001);
	float slope = rim_slope(x);
	vec2 inward = -outward * rim * refraction / tex_size;
	shift_r += inward * rim_shift(x, slope, IOR - dispersion);
	shift_g += inward * rim_shift(x, slope, IOR);
	shift_b += inward * rim_shift(x, slope, IOR + dispersion);
	clear = max(clear, mix(clarity, 1.0, 1.0 - smoothstep(0.0, 1.0, x)));
	// The steep outer rim reflects more than it lets through
	fresnel = max(fresnel, pow(1.0 - inversesqrt(1.0 + slope * slope), 3.0));
}

// The backdrop at uv: blurred, or unblurred as far as `clear` says.
vec3 see_through(vec2 uv, float clear) {
	return mix(texture2D(tex, uv).rgb, texture2D(sharp, uv).rgb, clear);
}

// How brightly an edge facing `outward` catches the light: most where it faces
// the light, and again, weaker, on the opposite side.
float lit(vec2 outward) {
	float facing = dot(outward, light);
	return pow(max(facing, 0.0), 2.0) + 0.6 * pow(max(-facing, 0.0), 2.0);
}

// How much of the pixel lies inside the lens's clip box: all of it without one.
float clip_cover() {
	if (lens_clip.z <= 0.0 || lens_clip.w <= 0.0) {
		return 1.0;
	}
	vec2 inside = min(gl_FragCoord.xy - lens_clip.xy, lens_clip.xy + lens_clip.zw - gl_FragCoord.xy);
	return clamp(min(inside.x, inside.y) + 0.5, 0.0, 1.0);
}

void main() {
	vec2 half_size = size * 0.5;
	vec2 p = gl_FragCoord.xy - position - half_size;
	float corner = p.y < 0.0 ? (p.x < 0.0 ? radius.x : radius.y)
		: (p.x < 0.0 ? radius.z : radius.w);
	float r = min(corner, min(half_size.x, half_size.y));
	vec2 outward;
	float d = box_distance(p, half_size, r, outward);
	float coverage = clamp(0.5 - d, 0.0, 1.0);
	if (coverage <= 0.0) {
		discard;
	}

	// The rim's slope follows a box at least as round as the rim is wide, so a
	// sharp corner does not crease the refraction along its diagonal.
	float rim = min(bezel, min(half_size.x, half_size.y));
	box_distance(p, half_size, max(r, rim), outward);
	float depth = -d;
	vec2 uv = gl_FragCoord.xy / tex_size;

	vec2 shift_r = vec2(0.0);
	vec2 shift_g = vec2(0.0);
	vec2 shift_b = vec2(0.0);
	float clear = clarity;
	float fresnel = 0.0;
	if (rim > 0.0 && depth < rim) {
		through_rim(depth, rim, outward, shift_r, shift_g, shift_b, clear, fresnel);
	}

	float lens_cover = 0.0;
	float lens_depth = 0.0;
	vec2 lens_outward = vec2(0.0);
	float cut = clip_cover();
	if (lens_size.x > 0.0 && lens_size.y > 0.0 && cut > 0.0) {
		vec2 lens_half = lens_size * 0.5;
		vec2 q = gl_FragCoord.xy - lens_position - lens_half;
		float lens_r = min(lens_radius, min(lens_half.x, lens_half.y));
		float lens_d = box_distance(q, lens_half, lens_r, lens_outward);
		lens_cover = clamp(0.5 - lens_d, 0.0, 1.0) * cut;
		lens_depth = -lens_d;
		float lens_rim = min(lens_bezel, min(lens_half.x, lens_half.y));
		box_distance(q, lens_half, max(lens_r, lens_rim), lens_outward);
		if (cut >= 0.5 && lens_depth > 0.0 && lens_depth < lens_rim) {
			through_rim(lens_depth, lens_rim, lens_outward, shift_r, shift_g, shift_b, clear,
				fresnel);
		}
	}

	vec3 color;
	color.r = see_through(uv + shift_r, clear).r;
	color.g = see_through(uv + shift_g, clear).g;
	color.b = see_through(uv + shift_b, clear).b;

	// Darken bright backdrops so light text on the glass stays legible, then
	// tint: the slab, and over it the lens.
	float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
	color *= 1.0 - dim * smoothstep(0.2, 1.0, luma);
	color = mix(color, tint.rgb, tint.a);
	color = mix(color, lens_tint.rgb, lens_tint.a * lens_cover);

	// Light: a thin line along the whole edge, the steep rim's reflection, and
	// a soft glow inside the edge that faces the light. The lens's edge has its
	// line too, fainter.
	float line = 1.0 - smoothstep(0.5 * scale, 2.0 * scale, depth);
	float glow = exp(-4.0 * depth / max(rim, 1.0)) * pow(max(dot(outward, light), 0.0), 3.0);
	float highlight = specular * (line * (0.3 + 0.7 * lit(outward)) + 0.35 * fresnel + 0.35 * glow);
	float lens_line = (1.0 - smoothstep(0.5 * scale, 2.0 * scale, lens_depth)) * lens_cover;
	highlight += 0.6 * specular * lens_line * (0.3 + 0.7 * lit(lens_outward));
	color = mix(color, vec3(1.0), clamp(highlight, 0.0, 1.0));

	gl_FragColor = vec4(color, 1.0) * (coverage * alpha);
}
