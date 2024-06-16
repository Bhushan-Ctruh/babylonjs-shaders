import {
  Effect,
  MeshBuilder,
  ReflectionProbe,
  Scene,
  ShaderMaterial,
  Vector2,
} from "@babylonjs/core";

Effect.ShadersStore["roundedRectVertexShader"] = `
            precision highp float;

            attribute vec3 position;
            attribute vec2 uv;

            uniform mat4 world;
            uniform mat4 view;
            uniform mat4 projection;
            uniform float uTime;
            

            varying vec2 vUV;
            
            void main() {
                vec4 p = vec4(position, 1.);
                vec4 modelPosition = world * vec4(position, 1.);

                gl_Position = projection * view * modelPosition;
                vUV = uv;
            }
`;

Effect.ShadersStore["roundedRectFragmentShader"] = `
            precision highp float;

            uniform float uTime;
            uniform vec2 uResolution;

            varying vec2 vUV;

            void main() {

                vec2 uv = vUV;
                vec2 boxPos = vec2(0.5, 0.5);    // center of the screen
                float radius = 0.05;
                vec2 boxBnd = vec2(0.25, 0.25);  // half of the area

                vec2 aspectRatio = vec2(uResolution.x/uResolution.y, 1.0);

                uv *= aspectRatio;
                boxPos *= aspectRatio;
                boxBnd *= aspectRatio;

                float alpha = length(max(abs(uv - boxPos) - boxBnd, 0.0));

                if(alpha <= 0.0){
                    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
                }else{
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                }
            }
`;


export class RoundedRect {
  private _scene: Scene;

  constructor(scene: Scene) {
    this._scene = scene;

    const plane = MeshBuilder.CreatePlane(
      "Screen",
      { width: 4, height: 5 },
      this._scene
    );

    const material = new ShaderMaterial(
      "name",
      scene,
      {
        vertex: "roundedRect",
        fragment: "roundedRect",
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
          "uResolution",
        ],
        needAlphaBlending: true,
      }
    );

    material.backFaceCulling = false;

    const getResolution = () => {
      const boundingbox = plane.getBoundingInfo().boundingBox;

      const width = boundingbox.maximum.x - boundingbox.minimum.x;
      const height = boundingbox.maximum.y - boundingbox.minimum.y;

      console.log(width, height);

      return new Vector2(width, height);
    };

    material.setVector2("uResolution", getResolution());

    const startTime = Date.now();

    scene.onBeforeRenderObservable.add(() => {
      const elapsedTime = Date.now() - startTime;
      material.setFloat("uTime", elapsedTime);
    });

    plane.material = material;
  }
}
