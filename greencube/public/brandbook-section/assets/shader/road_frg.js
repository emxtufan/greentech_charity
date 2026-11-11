uniform sampler2D tex;
uniform float alpha;


varying vec2 vUv;




void main()
{
    vec4 col = texture2D( tex, vUv );

	//vec4 col = texture2D( tex1, vUv );
	gl_FragColor = vec4( col.rgb, col.a * alpha );
}