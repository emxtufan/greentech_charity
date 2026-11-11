//FRAGMENT
uniform sampler2D map;
uniform float alpha;

varying vec2 vUv;

void main()
{
	vec2 suv = (vUv * 2.0 - 1.0) * 6.0;
	vec4 col = texture2D( map, vUv + suv );
	gl_FragColor = vec4(col.rgb, col.a * alpha);
}

