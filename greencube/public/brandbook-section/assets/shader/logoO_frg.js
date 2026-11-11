//FRAGMENT

uniform sampler2D tex;
uniform sampler2D texS;
uniform float alpha;
uniform float mixNum;

varying vec2 vUv;

void main()
{
	vec4 col = texture2D( tex, vUv );
	vec4 colS = texture2D( texS, vUv );

	vec4 mixCol = mix(colS, col, mixNum);
	gl_FragColor = vec4( mixCol.rgb, mixCol.a * alpha );
}