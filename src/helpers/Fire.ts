import { Color3, Effect, Scene, ShaderMaterial } from "@babylonjs/core";

Effect.ShadersStore["fireVertexShader"] = `
            precision highp float;

            attribute vec3 position;
            attribute vec3 normal;
            attribute vec2 uv;

            uniform mat4 world;
            uniform mat4 view;
            uniform mat4 projection;
            uniform float uTime;

            varying vec3 vPosition;
            varying vec3 vNormal;
            varying vec2 vUv;

            float random (vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898,78.233)))* 43758.5453123);
            }
            
            void main() {
                vec4 p = vec4(position, 1.);
                vec4 modelPosition = world * vec4(position, 1.);
                vec4 modelNormal = world * vec4(normal, 0.);

                gl_Position = projection * view * modelPosition;
                vPosition = modelPosition.xyz;
                vNormal = modelNormal.xyz;
                vUv = uv;
            }
`;

Effect.ShadersStore["fireFragmentShader"] = `
            precision highp float;

            uniform float uTime;
            uniform vec3 uCameraPosition;

            varying vec3 vPosition;
            varying vec3 vNormal;
            varying vec2 vUv;

            void main() {
                vec3 normal = normalize(vNormal);

                gl_FragColor = vec4(vUv, 1.0, 1.0);
            }
`;

export class fireMaterial {
  constructor(name: string, {}, scene: Scene) {
    const material = new ShaderMaterial(
      name,
      scene,
      {
        vertex: "fire",
        fragment: "fire",
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
        ],
        needAlphaBlending: true,
      }
    );

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
