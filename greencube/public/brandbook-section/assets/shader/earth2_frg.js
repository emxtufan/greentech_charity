//FRAGMENT

uniform sampler2D tex;
uniform sampler2D logoT;
uniform sampler2D logoMask;
uniform sampler2D maskT;
uniform float alpha;
uniform float logoMaskScale;
uniform float logoMaskScalePow;

varying vec2 vUv;
varying vec2 vRotUv;

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
	float strength = 0.20;
	vec2 p = -1.0 + 2.0 * vUv;
	float dist = sin(length(p * 12.0)) * strength;
	vec2 distUv = vUv + vec2(dist, dist);// * maskCol.b * 0.5;
	vec4 maskCol = texture2D( maskT, vec2(vUv.x, distUv.y) );


	float dist2 = sin(length(p * 9.0)) * maskCol.b * 0.5;
	vec2 distUv2 = vRotUv + vec2(dist2, dist2);;
	vec4 baseCol = texture2D( tex, distUv2 );

	vec4 oriCol = texture2D(tex, vUv);

	vec2 suv = (vUv * logoMaskScale) - (logoMaskScale * 0.5 - 0.5);
	vec4 logoMaskCol = texture2D(logoMask, suv);

	vec4 logoCol = texture2D(logoT, vUv);

	vec4 col = mix(baseCol, logoCol, logoMaskCol.r * logoMaskScalePow);

	float aa = col.a * alpha * (maskCol.r) * oriCol.a;
	gl_FragColor = vec4( (col.rgb) + maskCol.b, aa );

	//float aa = col.a * alpha * (maskCol.r) * oriCol.a;
	//gl_FragColor = logoMaskCol;
}