//FRAGMENT

uniform sampler2D tex;
uniform sampler2D mask;
uniform float alpha;

varying vec2 vUv;

void main()
{
	vec4 maskCol = texture2D( mask, vUv );
	vec4 col = texture2D( tex, vUv );

	gl_FragColor = vec4( col.rgb, col.a * alpha * maskCol.r );
}