//FRAGMENT

uniform sampler2D tex;
uniform float alpha;

varying vec2 vUv;

void main()
{
	vec4 col = texture2D( tex, vUv );
	gl_FragColor = vec4( 1.0 - col.rgb, col.a * alpha );
}