import {
  Color3,
  Effect,
  Scene,
  ShaderMaterial,
  Texture,
} from "@babylonjs/core";

Effect.ShadersStore["waterVertexShader"] = `
            precision highp float;

            attribute vec3 position;
            attribute vec3 normal;
            attribute vec2 uv;

            uniform mat4 world;
            uniform mat4 view;
            uniform mat4 projection;
            uniform float uTime;
            

            varying vec2 vUv;

            vec2 toPolar(vec2 cartesian){
              float distance = length(cartesian);
              float angle = atan(cartesian.y, cartesian.x);
              return vec2(angle / 3.14*2.0, distance);
            }

            
            void main() {
                vec4 p = vec4(position, 1.);
                vec4 modelPosition = world * vec4(position, 1.);

                // vec2 uv1 = uv;
                // uv1 -= 0.5;
                // uv1 *= 2.0;
                // float distance = 1.0 - distance(uv, vec2(0.0));
                // //sine wave
                // modelPosition.y += sin(uv.x * 10.0 + uTime * 0.001) * 0.05  ;
                // modelPosition.y += cos(uv.y * 10.0 + uTime * 0.001) * 0.05 ;

                gl_Position = projection * view * modelPosition;
                vUv = uv;
            }
`;

Effect.ShadersStore["waterFragmentShader"] = `
            precision highp float;

            uniform float uTime;
            uniform vec3 uColor;
            uniform sampler2D uWaterTexture;
            uniform sampler2D uPerlinNoise;
            uniform sampler2D uVornoiNoise;

            varying vec2 vUv;

            const mat2 myt = mat2(.12121212, .13131313, -.13131313, .12121212);
            const vec2 mys = vec2(1e4, 1e6);

            vec2 rhash(vec2 uv) {
              uv *= myt;
              uv *= mys;
              return fract(fract(uv / mys) * uv);
            }

            vec3 hash(vec3 p) {
              return fract(sin(vec3(dot(p, vec3(1.0, 57.0, 113.0)),
                                    dot(p, vec3(57.0, 113.0, 1.0)),
                                    dot(p, vec3(113.0, 1.0, 57.0)))) *
                          43758.5453);
            }

            float voronoi2d(const in vec2 point) {
              vec2 p = floor(point);
              vec2 f = fract(point);
              float res = 0.0;
              for (int j = -1; j <= 1; j++) {
                for (int i = -1; i <= 1; i++) {
                  vec2 b = vec2(i, j);
                  vec2 r = vec2(b) - f + rhash(p + b);
                  res += 1. / pow(dot(r, r), 8.);
                }
              }
              return pow(1. / res, 0.0625);
            }


            vec2 toPolar(vec2 cartesian){
                float distance = length(cartesian);
                float angle = atan(cartesian.y, cartesian.x);
                return vec2(angle / 3.14*2.0, distance);
            }

            void main() {
                vec4 color = vec4(uColor, 1.0);
                vec2 uv = vUv;
                uv -= 0.5;
                uv *= 2.0;

                // offset from center
                // uv.x += 0.5;
                // uv.y += 0.5;

                vec2 polarUv = toPolar(uv);
                // polarUv.x += sin(10.0) * polarUv.y * 1.0;

                // polarUv.x -= uTime * 0.0001;
                // polarUv.y -= uTime * 0.0001;

                // vec4 waterTex = texture2D(uVornoiNoise, polarUv) * color;
                // vec4 waterTex = texture2D(uVornoiNoise, polarUv) ;
                vec4 waterTex = vec4(voronoi2d(polarUv * 10.0));
                vec4 perlinNoise = texture2D(uPerlinNoise, polarUv);
                // gl_FragColor = waterTex;

                //smooth circle
                float distance = distance(uv, vec2(0.0));
                // float alpha = 1.0 - smoothstep(0.0, 1.0, distance);
                float sharpAlpha = 1.0 - step(0.8, distance);
                waterTex.a = sharpAlpha;
                // float t = 1.0 - smoothstep(0.0, 0.2, abs(0.5-distance));
                // float t2 = mix(0.0, perlinNoise.r, t);
                // gl_FragColor.a = mix(t2, alpha, alpha);

                // float strokeCircle =  smoothstep(0.5, 0.8, distance);

                float d = length( uv);

                // Calculate angle for directional variation
                float angle = atan(uv.y, uv.x);
                
                // Create layered waves with different frequencies
                float wave1 = 0.03 * sin(angle * 6.0 + d * 12.0 - uTime * 0.008);
                float wave2 = 0.02 * sin(angle * 8.0 - d * 15.0 + uTime * 0.002);
                float wave3 = 0.01 * sin(d * 20.0 - uTime * 0.005);
                
                // Combine waves and add to distance
                d += wave1 + wave2 + wave3;
                
                // Create rings with decay factor to make outer rings less prominent
                float decay = max(0.0, 1.0 - d * 0.5);
                vec4 rings = vec4( vec3(fract(d * 10.0) * decay), sharpAlpha);


                gl_FragColor = waterTex ;

            }
`;

export class WaterMaterial {
  constructor(name: string, scene: Scene) {
    const material = new ShaderMaterial(
      name,
      scene,
      {
        vertex: "water",
        fragment: "water",
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
          "uWaterTexture",
          "uPerlinNoise",
          "uVornoiNoise",
        ],
        needAlphaBlending: true,
      }
    );

    material.setColor3("uColor", new Color3(0, 1, 1));

    // material.backFaceCulling = false;

    // const camera = scene.activeCamera;

    // if (camera) {
    //   material.setVector3("uCameraPosition", camera.position);
    //   camera.onViewMatrixChangedObservable.add(() => {
    //     material.setVector3("uCameraPosition", camera.position);
    //   });
    // }

    const startTime = Date.now();

    scene.onBeforeRenderObservable.add(() => {
      const elapsedTime = Date.now() - startTime;
      material.setFloat("uTime", elapsedTime);
    });

    const waterTex = new Texture("/water texture.webp", scene);
    material.setTexture("uWaterTexture", waterTex);

    const perrinNoise = new Texture("/perlin_noise-z-2.png", scene);
    material.setTexture("uPerlinNoise", perrinNoise);

    const vornoiNoise = new Texture("/v.png", scene);
    material.setTexture("uVornoiNoise", vornoiNoise);

    return material;
  }
}

Effect.ShadersStore["waterPipeVertexShader"] = `
            precision highp float;

            attribute vec3 position;
            attribute vec3 normal;
            attribute vec2 uv;

            uniform mat4 world;
            uniform mat4 view;
            uniform mat4 projection;
            uniform float uTime;
            

            varying vec2 vUv;

            
            void main() {
                vec4 p = vec4(position, 1.);
                vec4 modelPosition = world * vec4(position, 1.);

                // if (abs(normal.z) < 0.5) {
                  // Calculate displacement based on height (y-coordinate)
                  float displacement = sin(modelPosition.y * 20.0 + uTime * 0.01) * 0.05;
                  
                  // Apply displacement along x-axis to create wavy effect
                  // This ensures peaks and valleys match on both sides
                  modelPosition.x += displacement;
                // }

                gl_Position = projection * view * modelPosition;
                vUv = uv;
            }
`;

Effect.ShadersStore["waterPipeFragmentShader"] = `
            precision highp float;

            uniform float uTime;
            uniform vec3 uColor;
            uniform sampler2D uPerlinNoise;
            uniform sampler2D uWaterTexture;

            varying vec2 vUv;

            vec2 toPolar(vec2 cartesian){
              float distance = length(cartesian);
              float angle = atan(cartesian.y, cartesian.x);
              return vec2(angle / 3.14*2.0, distance);
          }


            void main() {

                vec2 uv = vUv;
                uv = toPolar(uv);

                vec4 color = vec4(uColor, 1.0);
                vec4 waterTex = texture2D(uWaterTexture, uv) * color;
                gl_FragColor = waterTex;
                
                // gl_FragColor = vec4(t, 0.0, 1.0);
            }
`;

export class WaterPipeMaterial {
  constructor(name: string, scene: Scene) {
    const material = new ShaderMaterial(
      name,
      scene,
      {
        vertex: "waterPipe",
        fragment: "waterPipe",
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
          "uColor",
          "uPerlinNoise",
          "uWaterTexture",
        ],
        needAlphaBlending: true,
      }
    );

    material.setColor3("uColor", new Color3(0, 1, 1));

    const startTime = Date.now();

    scene.onBeforeRenderObservable.add(() => {
      const elapsedTime = Date.now() - startTime;
      material.setFloat("uTime", elapsedTime);
    });

    const waterTex = new Texture("/water texture.webp", scene);
    material.setTexture("uWaterTexture", waterTex);

    const perrinNoise = new Texture("/perlin_noise-z-2.png", scene);
    material.setTexture("uPerlinNoise", perrinNoise);

    return material;
  }
}
