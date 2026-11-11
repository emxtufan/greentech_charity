//VERTEX
attribute float alphas;
attribute float scales;
attribute vec2 suv;

varying vec2 vUv;
varying vec2 vSuv;
varying float vAlpha;


void main()
{
	vUv = uv;
	vAlpha = alphas;
	vSuv = suv;

	vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4( position, 1.0 );
	
	gl_Position = projectionMatrix * mvPosition;
}