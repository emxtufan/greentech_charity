//FRAGMENT

uniform sampler2D tex;
uniform sampler2D maskT;
uniform float alpha;

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
	float strength = 0.08;
	vec2 p = -1.0 + 2.0 * vUv;
	float dist = sin(length(p * 12.0)) * strength;
	vec2 distUv = vUv + vec2(dist, dist);// * maskCol.b * 0.5;

	vec4 maskCol = texture2D( maskT, vec2(vUv.x, distUv.y) );

	///////////////////////////////
	/*float strength = 0.022;//0.02;
	float size = 8.0;
	vec2 center = vec2(0.5, 0.5);
	vec2 p = -1.0 + 2.0 * vUv;
	vec2 distVec2 = vec2(sin(length(p*size)) * 1.5, cos(length(p*size)) * 1.5 );
	vec2 newUv = vUv + ( strength ) * distVec2;
	vec2 newUv2 = vUv;//vUv + ( strength * 0.5 ) * distVec2;

	//strength 1
	float disX = newUv.x - center.x;
	float disY = newUv.y - center.y;
	float rr = sqrt(disX * disX + disY * disY);
	float kk = atan2(disY, disX);

	//strength 2
	float disX2 = newUv2.x - center.x;
	float disY2 = newUv2.y - center.y;
	float rr2 = sqrt(disX2 * disX2 + disY2 * disY2);
	float kk2 = atan2(disY2, disX2);

	float nx = cos(kk2) * rr2 * (maskCol.r * 10.01) + center.x;
	float ny = sin(kk2) * rr2 * (maskCol.r * 10.01) + center.y;
	vec2 distUv = vec2(nx, ny);*/
	///////////////////////////////

	////////////////////////////////
	//vec2 suv = (vUv * 2.0 - 1.0) * maskCol.r;
	//vec2 distUv = vUv + suv;// * maskCol.b * 0.5;
	///////////////////////////////

	////////////////////////////////
	//vec2 p = -1.0 + 2.0 * vUv;
	//float dist = sin(length(p * 20.0)) * (maskCol.r * 0.05);
	//vec2 distUv = vUv + vec2(dist, dist);// * maskCol.b * 0.5;
	///////////////////////////////

	////////////////////////////////
	/*float fishFov = 160.0;
	float ff = (fishFov) * PI / 180.0;
	vec2 fuv = (vUv * 2.0 - 1.0);
	float fk = fishEyeCorrection(ff, fuv);
	
	vec2 distUv = vec2(fuv.x / fk, fuv.y / fk);
	//vec2 distUv = vec2(fuv.x * fk, fuv.y * fk);
	vec2 mirrorUv = (distUv + 1.0) / 2.0;

	float mixN = maskCol.r * 2.0;//mixNum * mixNumPow;
	float uvx = mix(vUv.x, mirrorUv.x, mixN);
	float uvy = mix(vUv.y, mirrorUv.y, mixN);

	distUv = vec2(uvx, uvy);*/
	//////////

	float dist2 = sin(length(p * 9.0)) * maskCol.b * 0.02;
	vec2 distUv2 = vUv + vec2(dist2, dist2);// * maskCol.b * 0.5;
	vec4 col = texture2D( tex, distUv2 );

	float aa = col.a * alpha * (1.0 - maskCol.r);
	gl_FragColor = vec4( (1.0 - col.rgb) + maskCol.b * 0.5, aa );
	//gl_FragColor = vec4( maskCol.rgb, 1.0 );
}