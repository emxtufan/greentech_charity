//FRAGMENT
uniform sampler2D map1;
uniform sampler2D map2;
uniform sampler2D map3;
uniform float mapScale;
uniform float alpha;

varying vec2 vUv;
varying vec2 vSuv;
varying float vAlpha;
varying float vMapNums;

void main()
{
	vec2 baseUv = vec2(vUv.x * mapScale + vSuv.x, vUv.y * mapScale + vSuv.y);
	
	vec2 newUv = baseUv;
	vec4 col = vec4(0.0, 0.0, 0.0, 0.0);//texture2D( map1, newUv );

	if(vMapNums == 1.0)
	{
		col = texture2D( map1, newUv );
	}
	else if(vMapNums == 2.0)
	{
		col = texture2D( map2, newUv );
	}
	else if(vMapNums == 3.0)
	{
		col = texture2D( map3, newUv );
	}

	gl_FragColor = vec4(col.rgb, col.a * vAlpha * alpha);
}

