//FRAGMENT

uniform sampler2D tex;
uniform float alpha;
uniform float shiftX;

varying vec2 vUv;

void main()
{
	vec4 col = texture2D( tex, vec2(vUv.x + shiftX, vUv.y) );
	gl_FragColor = vec4( col.rgb, col.a * alpha );
}