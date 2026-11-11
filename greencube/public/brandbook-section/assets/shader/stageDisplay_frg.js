
uniform sampler2D tex;
uniform sampler2D maskTex;
uniform sampler2D noise;
uniform float alpha;
uniform vec2 asp;
uniform float mixNum;
uniform float mixNumPow;
uniform float fishFov;
uniform float wavePow;

varying vec2 vUv;

const float PI = 3.141592653589793;

vec2 mirror(vec2 v)
{
	vec2 m = mod(v,2.0);
	return mix(m,2.0 - m, step(1.0 ,m));
}


float atan2(float yy, float xx)
{
	return xx == 0.0 ? sign(yy)*PI / 2.0 : atan(yy, xx);
}


float fishEyeCorrection (float fov, vec2 uv)
{
	float x = uv.x;
	float y = uv.y;
	float z = 1.0/tan(fov / 2.0);

	float xy_len = length(uv);//sqrt(x*x+y*y);

	//float a = atan(x, y);
	float b = atan(xy_len, z);
	float k = 2.0*b/(xy_len*fov);

	return k;
}


void main()
{
	//vec4 noiseCol = texture2D( noise, vUv );
	vec4 maskCol = texture2D( maskTex, vUv );

	////////////////////////////////
	vec2 p = -1.0 + 2.0 * vUv;
	float dist = tan(length(p * maskCol.b * wavePow));
	vec2 distUv = vUv + vec2(dist, dist);// * maskCol.b * 0.5;
	///////////////////////////////

	//////////
	float ff = (fishFov) * PI / 180.0;
	vec2 fuv = (distUv * 2.0 - 1.0);
	fuv /= asp.x / asp.y;
	float fk = fishEyeCorrection(ff, fuv);
	
	//vec2 fishUv = vec2(fuv.x / fk, fuv.y / fk);
	vec2 fishUv = vec2(fuv.x * fk, fuv.y * fk);
	vec2 mirrorUv = (fishUv + 1.0) / 2.0;

	float mixN = mixNum * mixNumPow;
	float uvx = mix(vUv.x, mirrorUv.x, mixN);
	float uvy = mix(vUv.y, mirrorUv.y, mixN);

	fishUv = vec2(uvx, uvy);
	//////////

    //vec4 noiseCol = texture2D( noise, vUv );
	
	vec4 col = texture2D( tex, fishUv );
	//vec4 col = texture2D( tex, distUv );

	gl_FragColor = vec4( col.rgb + maskCol.b * 0.15, alpha * maskCol.r );
	//gl_FragColor = vec4( maskCol.rgb, alpha );
}