import { Color3, Effect, Scene, ShaderMaterial } from "@babylonjs/core";

Effect.ShadersStore["shadingVertexShader"] = `
            precision highp float;

            attribute vec3 position;
            attribute vec3 normal;

            uniform mat4 world;
            uniform mat4 view;
            uniform mat4 projection;
            uniform float uTime;

            varying vec3 vPosition;
            varying vec3 vNormal;
            
            void main() {
                vec4 p = vec4(position, 1.);
                vec4 modelPosition = world * vec4(position, 1.);
                vec4 modelNormal = world * vec4(normal, 0.);

                gl_Position = projection * view * modelPosition;
                vPosition = modelPosition.xyz;
                vNormal = modelNormal.xyz;
            }
`;

Effect.ShadersStore["shadingFragmentShader"] = `
            precision highp float;

            uniform float uTime;
            uniform vec3 uCameraPosition;
            uniform vec3 uColor;

            varying vec3 vPosition;
            varying vec3 vNormal;

            vec3 ambientLight (vec3 lightColor, float intensity) {
                return lightColor * intensity;
            }

            vec3 directionalLight (vec3 lightColor, float lightIntensity, vec3 normal, vec3 lightPosition, vec3 viewDirection, float specularPower) {
                vec3 lightDirection = normalize(lightPosition);
                vec3 lightReflection = reflect(-lightDirection, normal);

                float shading = dot(normal,lightDirection);
                shading = max(shading, 0.0);

                float specular = - dot(lightReflection, viewDirection);
                specular = max(0.0, specular);
                specular = pow(specular, specularPower);

                return lightColor  * lightIntensity * (shading +  specular);
            }

            void main() {
                vec3 normal = normalize(vNormal);

                vec3 viewDirection = normalize(vPosition - uCameraPosition);

                vec3 color = uColor;

                //Lights
                vec3 lights = vec3(0.0);

                lights += ambientLight(
                    vec3(1.0, 1.0, 1.0),  //Light Color
                    0.03                  //Light Intensity
                );

                //Directional Light
                lights += directionalLight(
                    vec3(0.1, 0.1, 1.0),     //Light Color
                    1.0,                     //Light Intensity
                    normal,                  //normal
                    vec3(3.0, 0.0, 0.0),     //Light Position
                    viewDirection,           //View Direction
                    20.0                     //Specular power
                );

                lights += directionalLight(
                    vec3(1.0, 0.1, 0.1),     //Light Color
                    1.0,                     //Light Intensity
                    normal,                  //normal
                    vec3(-3.0, 0.0, 0.0),     //Light Position
                    viewDirection,           //View Direction
                    20.0                     //Specular power
                );
                

                color *= lights;
                // color = pow(color, vec3(1.0 / 2.2));
                gl_FragColor = vec4(color, 1.0);
            }
`;

export class ShadingMaterial {
  constructor(name: string, scene: Scene) {
    const material = new ShaderMaterial(
      name,
      scene,
      {
        vertex: "shading",
        fragment: "shading",
      },
      {
        attributes: ["position", "normal", "uv"],
        uniforms: [
          "world",
          "worldView",
          "worldViewProjection",
          "view",
          "projection",
          "viewProjection",
          "uTime",
          "uCameraPosition",
          "uColor",
        ],
        // needAlphaBlending: true,
      }
    );

    material.setColor3("uColor", new Color3(1, 1, 1));

    material.backFaceCulling = false;

    const camera = scene.activeCamera;

    if (camera) {
      material.setVector3("uCameraPosition", camera.position);
      camera.onViewMatrixChangedObservable.add(() => {
        material.setVector3("uCameraPosition", camera.position);
      });
    }

    const startTime = Date.now();

    scene.onBeforeRenderObservable.add(() => {
      const elapsedTime = Date.now() - startTime;
      material.setFloat("uTime", elapsedTime);
    });

    return material;
  }
}
