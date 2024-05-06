import { Color3, Effect, Scene, ShaderMaterial } from "@babylonjs/core";

Effect.ShadersStore["hologramVertexShader"] = `
            precision highp float;

            attribute vec3 position;
            attribute vec3 normal;

            uniform mat4 world;
            uniform mat4 view;
            uniform mat4 projection;
            uniform float uTime;

            uniform float uGlitchStrength;

            varying vec3 vPosition;
            varying vec3 vNormal;

            float random (vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898,78.233)))* 43758.5453123);
            }
            
            void main() {
                vec4 p = vec4(position, 1.);
                vec4 modelPosition = world * vec4(position, 1.);
                vec4 modelNormal = world * vec4(normal, 0.);

                float glitchTime = uTime - modelPosition.y;
                float glitchStrength = sin(glitchTime);
                glitchStrength += sin(glitchTime * 3.45);
                glitchStrength += sin(glitchTime * 8.78);
                glitchStrength /= 3.0;
                glitchStrength = smoothstep(0.3, 1.0, glitchStrength);
                glitchStrength *= 0.2 * uGlitchStrength;

                modelPosition.x += (random(modelPosition.xz + uTime ) - 0.5) * glitchStrength ;
                modelPosition.x += (random(modelPosition.zx + uTime ) - 0.5) * glitchStrength ;

                gl_Position = projection * view * modelPosition;
                vPosition = modelPosition.xyz;
                vNormal = modelNormal.xyz;
            }
`;

Effect.ShadersStore["hologramFragmentShader"] = `
            precision highp float;

            uniform float uTime;
            uniform vec3 uCameraPosition;

            uniform float uNumberOfStripes;
            uniform vec3 uColor;
            uniform float uStripeSpeed;

            varying vec3 vPosition;
            varying vec3 vNormal;

            void main() {
                vec3 normal = normalize(vNormal);

                if(!gl_FrontFacing){
                    normal *= -1.0;
                }

                float stripes = fract((vPosition.y - uTime * 0.0001 * uStripeSpeed)  * uNumberOfStripes);
                stripes = pow(stripes, 3.0);

                //Fresnel
                vec3 viewDirection = normalize(vPosition - uCameraPosition);
                float fresnel = 1.0 + dot(normal, viewDirection);
                fresnel = pow(fresnel, 2.0);

                //Falloff
                float falloff = smoothstep(0.8, 0.0, fresnel);

                float holographic = stripes * fresnel;
                holographic += fresnel * 1.25;
                holographic *= falloff;

                gl_FragColor = vec4(uColor, holographic);
            }
`;

export class HologramMaterial {
  constructor(
    name: string,
    {
      numberOfStripes,
      color,
      stripeSpeed,
      glitchStrength
    }: { numberOfStripes?: number; color?: Color3; stripeSpeed?: number, glitchStrength? : number },
    scene: Scene
  ) {
    const material = new ShaderMaterial(
      name,
      scene,
      {
        vertex: "hologram",
        fragment: "hologram",
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
          "uNumberOfStripes",
          "uColor",
          "uStripeSpeed",
          "uGlitchStrength"
        ],
        needAlphaBlending: true,
      }
    );

    material.setFloat("uNumberOfStripes", numberOfStripes || 20);
    material.setColor3("uColor", color || new Color3(1, 0.1, 0.1));
    material.setFloat("uStripeSpeed", stripeSpeed || 1);
    material.setFloat("uGlitchStrength", glitchStrength || 1)

    material.backFaceCulling = false;

    const camera = scene.activeCamera;

    if (camera) {
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
