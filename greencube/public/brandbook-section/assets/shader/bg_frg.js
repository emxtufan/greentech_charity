//FRAGMENT
uniform sampler2D map;
uniform sampler2D noiseMap;
uniform sampler2D maskMap;
uniform float alpha;

varying vec2 vUv;

void main()
{
	vec4 col = texture2D( map, vUv );
	vec4 noiseCol = texture2D( noiseMap, vUv * 7.0 );
	vec4 maskCol = texture2D( maskMap, vUv );

	float aa = min(max((col.a * alpha) - noiseCol.r * 0.2 + maskCol.r * 0.7, 0.0), 1.0);
	gl_FragColor = vec4(col.rgb * vec3(0.995833, 0.9875, 0.933333), aa);
}

