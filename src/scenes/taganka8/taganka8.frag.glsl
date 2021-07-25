precision mediump float;

varying vec3 vPosition;
varying vec4 vColor;
varying vec3 vNormal;
void main(void) {
  vec3 toLight1 = vec3(1, 2, -0.8);
  toLight1 = normalize(toLight1);

  vec3 toLight2 = vec3(-1, 0.2, 1);
  toLight2 = normalize(toLight2);

  vec3 vNormalNormalized;
  float cosAngle;

  // The vertex's normal vector is being interpolated across the primitive
  // which can make it un-normalized. So normalize the vertex's normal vector.
  vNormalNormalized = normalize(vNormal);

  // Calculate the cosine of the angle between the vertex's normal vector
  // and the vector going to the light.
  cosAngle = dot(vNormalNormalized, toLight1);
  cosAngle = clamp(cosAngle, 0.0, 1.0);
  vec3 diffuseColor1 = vec3(vColor) * cosAngle;
  cosAngle = dot(vNormalNormalized, toLight2);
  cosAngle = clamp(cosAngle, 0.0, 1.0);
  vec3 diffuseColor2 = vec3(vColor) * cosAngle;

  vec3 reflection = 2.0 * dot(vNormalNormalized, toLight1) * vNormalNormalized - toLight1;
  reflection = normalize(reflection);
  vec3 toCamera = -1.0 * vPosition;
  toCamera = normalize(toCamera);

  cosAngle = dot(reflection, toCamera);
  cosAngle = clamp(cosAngle, 0.0, 1.0);
  float shininess = 500.0;
  cosAngle = pow(cosAngle, shininess);

  // The specular color is from the light source, not the object
  vec3 specularColor;
  if (cosAngle > 0.0) {
    vec3 lightColor = vec3(1.0, 1.0, 1.0);
    specularColor = lightColor * cosAngle;
    diffuseColor1 = diffuseColor1 * (1.0 - cosAngle);
  } else {
    specularColor = vec3(0.0, 0.0, 0.0);
  }

  vec3 ambientColor = vec3(0.1, 0.1, 0.1);
  ambientColor = ambientColor * vec3(vColor);

  // Scale the color of this fragment based on its angle to the light.
  gl_FragColor = vec4(diffuseColor1 + diffuseColor2 + specularColor + ambientColor, vColor.a);
}
