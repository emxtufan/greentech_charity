//FRAGMENT
uniform float rr;
uniform float gg;
uniform float bb;
uniform float alpha;

varying vec2 vUv;

void main()
{
	gl_FragColor = vec4(rr, gg, bb, alpha);
}

