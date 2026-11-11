//VERTEX
attribute float alphas;
attribute float scales;
attribute float mapNum;
attribute vec2 suv;

varying vec2 vUv;
varying vec2 vSuv;
varying float vAlpha;
varying float vMapNum;


void main()
{
	vUv = uv;
	vAlpha = alphas;
	vSuv = suv;
	vMapNum = mapNum;

	vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4( position, 1.0 );
	
	gl_Position = projectionMatrix * mvPosition;
}