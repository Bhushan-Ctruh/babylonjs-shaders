import { Effect, Scene, ShaderMaterial, Texture } from "@babylonjs/core";

Effect.ShadersStore["smokeVertexShader"] = `
            precision highp float;

            attribute vec3 position;
            attribute vec3 normal;
            attribute vec2 uv;

            uniform mat4 world;
            uniform mat4 view;
            uniform mat4 projection;
            uniform float uTime;
            uniform sampler2D uPerlinTexture;

            varying vec3 vPosition;
            varying vec3 vNormal;
            varying vec2 vUv;


            vec2 rotate2D(vec2 value, float angle){
                float s = sin(angle);
                float c = cos(angle);
            
                mat2 m = mat2(c, s, -s, c);
                return m * value;
            }

            
            void main() {
                

                vec3 newPosition = position;

                float twistPerlin = texture2D(uPerlinTexture, vec2(0.5, uv.y * 0.2 - uTime * 0.00002)).r;
                float angle =  twistPerlin * 10.0;
                newPosition.xz = rotate2D(newPosition.xz,angle);

                float swayPerlinX = texture2D(uPerlinTexture, vec2(0.25, uTime  * 0.0001)).r - 0.5;
                float swayPerlinZ = texture2D(uPerlinTexture, vec2(0.75, uTime  * 0.0001)).r - 0.5;
                vec2 windOffset = vec2(swayPerlinX, swayPerlinZ);
                windOffset *= 1.0 * pow(uv.y, 2.0);
                newPosition.xz += windOffset;
                
                vec4 modelPosition = world * vec4(newPosition, 1.);

                gl_Position = projection * view * modelPosition;
                vUv = uv;
            }
`;

Effect.ShadersStore["smokeFragmentShader"] = `
            precision highp float;

            uniform float uTime;
            uniform sampler2D uPerlinTexture;

            varying vec2 vUv;

            void main() {
                vec2 smokeUv = vUv;
                smokeUv.x *= 0.5;
                smokeUv.y *= 0.3;
                smokeUv.y -= uTime * 0.0001;

                //Smoke
                float smoke = texture2D(uPerlinTexture, smokeUv).r;
                vec4 smokeTex = texture2D(uPerlinTexture, smokeUv);
                // Remap
                smoke = smoothstep(0.4, 1.0, smoke);

                //fade edges
                float leftEdge = smoothstep(0.0, 0.1, vUv.x);
                float rightEdge = smoothstep(1.0, 0.9, vUv.x);
                float bottomEdge = smoothstep(0.0, 0.1, vUv.y);
                float topEdge = smoothstep(1.0, 0.4, vUv.y);
                smoke *= leftEdge *  rightEdge * bottomEdge * topEdge;

                //final color
                gl_FragColor = smokeTex;
                gl_FragColor = vec4(1.0, 1.0, 1.0, smoke);

            }
`;

export class SmokeMaterial {
  constructor(name: string, {}, scene: Scene) {
    const material = new ShaderMaterial(
      name,
      scene,
      {
        vertex: "smoke",
        fragment: "smoke",
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
          "uPerlinTexture",
        ],
        needAlphaBlending: true,
      }
    );

    material.disableDepthWrite = true;

    material.backFaceCulling = false;

    const startTime = Date.now();

    scene.onBeforeRenderObservable.add(() => {
      const elapsedTime = Date.now() - startTime;
      material.setFloat("uTime", elapsedTime);
    });

    const perlinTexture = new Texture("/perlin.png", scene);
    material.setTexture("uPerlinTexture", perlinTexture);

    return material;
  }
}
