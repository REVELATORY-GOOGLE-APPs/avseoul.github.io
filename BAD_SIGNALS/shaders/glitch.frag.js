var glitch_frag = 
`
varying vec2 v_uv;

uniform float u_t;
uniform bool u_is_init;

uniform float u_audio_high;
uniform float u_audio_mid;
uniform float u_audio_bass;
uniform float u_audio_level;
uniform float u_audio_history;

uniform bool is_master_ziggle;
uniform bool is_monochrome;
uniform bool is_ntsc_rolling;
uniform bool is_ntsc_roll;
uniform bool is_bad_signals;
uniform bool is_VHS;
uniform bool is_noise;
uniform bool is_rgb_shift;

uniform sampler2D u_tex_src;

float hash(float _v, float _t) {
	return fract(sin(_v)*43758.5453123 + _t);
}

float hash(vec2 p) {
	float h = dot(p,vec2(127.1,311.7));
	return -1.0 + 2.0*fract(sin(h)*43758.5453123);
}

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);

	vec2 u = f*f*(3.0-2.0*f);

	return mix(mix(hash( i + vec2(0.0,0.0) ), 
		hash( i + vec2(1.0,0.0) ), u.x),
	mix( hash( i + vec2(0.0,1.0) ), 
		hash( i + vec2(1.0,1.0) ), u.x), u.y);
}

void main(){
	vec2 m_uv = v_uv;

	vec3 c;

	// audio input vars
	float m_ahigh = u_audio_high;
	float m_amid = u_audio_mid;
	float m_abass = u_audio_bass;
	float m_alevel = u_audio_level;
	float m_aframe = u_audio_history;
	
	float m_glitch = 0.;

	vec2 m_noise_seed = vec2(m_aframe*10., m_uv.y);

	float m_flicker = noise(vec2(.0, m_uv.y-m_aframe*10.));

	// slice vars
	const float m_num_slice = 5.;
	float m_slice = floor(m_uv.y * m_num_slice);
    float m_rand = hash(m_slice/m_num_slice + .4562341, 0.);
    m_rand *= hash(m_rand/m_num_slice, m_aframe);

	// VHS color bar ziggle
	if(is_VHS){
		// up&down ziggle
		m_uv -= .5;
		m_uv.y += (2. * m_ahigh * (1.-2.*m_rand));
		m_uv += .5;
	}

	// wave
	if(is_ntsc_roll){
		// big shear
		m_glitch += pow(noise(m_noise_seed * .2), 2.) * .5 * m_abass;
		m_glitch -= pow(noise(-m_noise_seed * .2), 2.) * .5 * m_abass; 

		// low freq wav
		m_glitch += pow(noise(m_noise_seed * 1.), 15.) * .5 * m_amid; 
		m_glitch -= pow(noise(-m_noise_seed * 1.), 15.) * .5 * m_amid; 
		
		// tiny hi freq ziggle 
		m_glitch += pow(noise(m_noise_seed * 15.), 10.) * .5 * m_ahigh; 
		m_glitch -= pow(noise(-m_noise_seed * 30.), 10.) * .5 * m_ahigh; 
	}

	// render image 
	{
		float rgb_shift = is_rgb_shift ? .3 * m_ahigh * m_glitch + .008 * m_alevel : 0.;
		if(is_monochrome){
			c.r = texture2D(u_tex_src, fract(m_uv + vec2(m_glitch + rgb_shift, 0.))).g;
			c.g = texture2D(u_tex_src, fract(m_uv + vec2(m_glitch, 0.0))).g;
			c.b = texture2D(u_tex_src, fract(m_uv + vec2(m_glitch - rgb_shift, 0.))).g;
		} else {
			c.r = texture2D(u_tex_src, fract(m_uv + vec2(m_glitch + rgb_shift, 0.))).r;
			c.g = texture2D(u_tex_src, fract(m_uv + vec2(m_glitch, 0.0))).g;
			c.b = texture2D(u_tex_src, fract(m_uv + vec2(m_glitch - rgb_shift, 0.))).b;
		}
	}

	// ntsc rolling flicker bar
	if(is_ntsc_roll){	
		// c = mix(c, vec3(0.), m_glitch * 50.);
	}

	// VHS blend ziggle
	if(is_VHS){
		vec2 m_ziggle_uv = m_uv + m_glitch;
		m_ziggle_uv.y += (1.-2.*hash(m_ahigh, m_aframe))*.1;
		vec3 m_blend_ziggle = texture2D(u_tex_src, fract(m_ziggle_uv)).rgb;
		c += m_blend_ziggle;
		c /= 2.;
	}

	// VHS color bar burn 
	if(is_VHS){
		// create random seed
		float _seed_a = hash(m_slice/10. + .12347, -m_aframe * 1.9);
		float _seed_b = hash(m_slice/5. + .34562, -m_aframe * 1.7);
		float _seed_c = hash(m_slice/2. + .78906, -m_aframe * 1.8);
		float m_seed = (_seed_a * _seed_b * _seed_c)/3.; //<-- normalized 0-1
		
		// seed selector bar
		// should be less than 1.
		float m_glitch_freq = m_ahigh * .1;

		// color burn based on seed event 
		if(m_seed > m_glitch_freq){
			c.r *= _seed_a * hash(m_ahigh, .23) * 16.;
			c.g *= _seed_b * hash(m_ahigh, .34) * 16.;
			c.b *= _seed_c * hash(m_ahigh, .45) * 16.;
		} else {
			if(is_monochrome)
				c.r = c.g = c.b;
		}
	}

	gl_FragColor = vec4(c, 1.);
}
`;