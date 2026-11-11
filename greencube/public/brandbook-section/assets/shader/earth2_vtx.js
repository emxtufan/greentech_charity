//VERTEX
//https://forum.godotengine.org/t/simple-texture-rotation-shader/24198/2

uniform float rot;
varying vec2 vUv;
varying vec2 vRotUv;

vec2 rotateUV(vec2 tuv, vec2 pivot, float rotation)
{
	float cosa = cos(rotation);
	float sina = sin(rotation);
	tuv -= pivot;
	return vec2(
		cosa * tuv.x - sina * tuv.y,
		cosa * tuv.y + sina * tuv.x 
	) + pivot;
}

void main()
{
	vUv = uv;
	vRotUv = rotateUV(uv, vec2(0.5), rot);
	
	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );	
	gl_Position = projectionMatrix * mvPosition;
}