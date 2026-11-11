//FRAGMENT
uniform sampler2D map;
uniform float mapScale;
uniform float alpha;

varying vec2 vUv;
varying vec2 vSuv;
varying float vAlpha;


void main()
{
	vec2 baseUv = vec2(vUv.x * mapScale + vSuv.x, vUv.y * mapScale + vSuv.y);
	
	vec2 newUv = baseUv;
	vec4 col = texture2D( map, newUv );

	gl_FragColor = vec4(col.rgb, col.a * vAlpha * alpha);
}

