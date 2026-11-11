uniform sampler2D tex;
uniform float alpha;


varying vec2 vUv;




void main()
{
	vec4 col = texture2D( tex, vec2(vUv.x, vUv.y) );
	gl_FragColor = vec4( col.rgb, col.a * alpha );
}