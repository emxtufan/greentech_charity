//VERTEX
attribute float alphas;
attribute float scales;
attribute float mapNums;
attribute vec2 suv;

varying vec2 vUv;
varying vec2 vSuv;
varying float vAlpha;
varying float vMapNums;


void main()
{
	vUv = uv;
	vAlpha = alphas;
	vMapNums = mapNums;
	vSuv = suv;

	vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4( position, 1.0 );
	
	gl_Position = projectionMatrix * mvPosition;
}