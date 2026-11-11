//FRAGMENT

uniform sampler2D tex;
uniform sampler2D gTex;
uniform float alpha;
uniform float alpha2;
uniform float shiftX;

varying vec2 vUv;

void main()
{
	vec4 col = texture2D( tex, vUv );
	vec4 gCol = texture2D( gTex, vec2(vUv.x + shiftX, vUv.y) );
	gl_FragColor = vec4( gCol.rgb, col.a * alpha * alpha2 );
}