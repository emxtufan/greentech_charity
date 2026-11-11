//FRAGMENT

uniform sampler2D tex;
uniform float alpha;
uniform vec3 baseCol;

varying vec2 vUv;

void main()
{
	vec4 col = texture2D( tex, vUv );
	gl_FragColor = vec4( baseCol, col.a * alpha );
}