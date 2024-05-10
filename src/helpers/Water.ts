import {
  BoundingBoxGizmo,
  Color3,
  Effect,
  HDRCubeTexture,
  Matrix,
  MeshBuilder,
  ShaderMaterial,
  StandardMaterial,
  Texture,
  Vector2,
} from "@babylonjs/core";
import { Experience } from "../Experience";
import { WaterMaterial } from "@babylonjs/materials";

Effect.ShadersStore["waterVertexShader"] = `
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
                vec4 modelPosition = world * vec4(position, 1.);
                vec4 modelNormal = world * vec4(normal, 0.);

                gl_Position = projection * view * modelPosition;
                vPosition = modelPosition.xyz;
                vNormal = modelNormal.xyz;
            }
`;

Effect.ShadersStore["waterFragmentShader"] = `
            precision highp float;

            uniform float uTime;
            uniform vec3 uCameraPosition;

            uniform samplerCube uEnvMap;
            uniform samplerCube uPoolMap;

            uniform mat4 uInverseViewMatrix;

            varying vec3 vPosition;
            varying vec3 vNormal;

            void main() {

                vec3 normal = normalize(vNormal);

                vec3 viewDirection = normalize(vPosition - uCameraPosition);

                float fresnel = 1.0 + dot(normal, viewDirection);

                vec3 iblCord = normalize(reflect(-viewDirection,normal)) ;

                vec3 iblSample = textureCube(uEnvMap, iblCord ).rgb;

                iblSample = iblSample / (iblSample + vec3(1.0));



                vec3 worldViewDirection = (uInverseViewMatrix * vec4(normalize(refract(-viewDirection,normal, 1.33)), 0.0)).xyz;
                worldViewDirection = normalize(worldViewDirection);
                vec3 interiorColor = textureCube(uPoolMap, worldViewDirection * 0.0000002).rgb;
                interiorColor = interiorColor / (interiorColor + vec3(1.0));

                vec3 s = mix(interiorColor, iblSample, fresnel);

                gl_FragColor = vec4(interiorColor, fresnel);
                gl_FragColor = vec4(s, 1.0);
            }
`;

export class Water {
  private _experience: Experience;

  constructor(experience: Experience) {
    this._experience = experience;

    this._experience
      ._loadModel("", "", "pool.glb", this._experience.scene)
      .then((meshes) => {
        const root = meshes[0];
        root.scaling.set(500, 500, 500);
        const waterPlane = meshes.find((mesh) => mesh.name === "Plane.001");

        if (waterPlane) {
          waterPlane.material?.dispose();
          waterPlane.computeWorldMatrix(true);
          // const bb = waterPlane.getBoundingInfo().boundingBox;

          //   const width = bb.extendSize.x ;
          //   const height = bb.extendSize.z ;

          //   const plane = MeshBuilder.CreatePlane(
          //     "plane",
          //     { width, height },
          //     this._experience.scene
          //   );
          //   plane.position.set(
          //     bb.centerWorld.x,
          //     bb.centerWorld.y,
          //     bb.centerWorld.z
          //   );

          //   plane.rotation.x = Math.PI/2
          //   const box = MeshBuilder.CreateBox("asd", {size: 10}, this._experience.scene)

          const material = new ShaderMaterial(
            "water-shader-mat",
            this._experience.scene,
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
                "uEnvMap",
                "uInverseViewMatrix",
                "uPoolMap",
              ],
              needAlphaBlending: true,
            }
          );

          const camera = this._experience.scene.activeCamera;

          if (camera) {
            camera.onViewMatrixChangedObservable.add(() => {
              material.setVector3("uCameraPosition", camera.position);
              const inverseViewMatrix = Matrix.Invert(camera.getViewMatrix());
              material.setMatrix("uInverseViewMatrix", inverseViewMatrix);
            });
          }

          const env = new HDRCubeTexture(
            "/test.hdr",
            this._experience.scene,
            512
          );
          env.coordinatesMode = Texture.SKYBOX_MODE;

          const waterHdr = new HDRCubeTexture(
            "/pool.hdr",
            this._experience.scene,
            512
          );
          waterHdr.coordinatesMode = Texture.SKYBOX_MODE;

          material.setTexture("uEnvMap", env);
          material.setTexture("uPoolMap", waterHdr);

          const waterMaterial = new WaterMaterial(
            "water",
            this._experience.scene
          );
          waterPlane.material = waterMaterial;

          //   waterPlane.material = material;

          waterMaterial.bumpTexture = new Texture(
            "https://playground.babylonjs.com/textures/waterbump.png",
            this._experience.scene
          );

          // Water properties
          waterMaterial.windForce = -15;
          waterMaterial.waveHeight = 0.3;
          waterMaterial.windDirection = new Vector2(1, 1);
          waterMaterial.waterColor = new Color3(1.0, 0.1, 1.0);
          waterMaterial.colorBlendFactor = 0.3;
          waterMaterial.bumpHeight = 0.1;
          waterMaterial.waveLength = 0.01;
          waterPlane.isPickable = false;

          const m = [
            "Cube.001",
            "Cube.017_primitive1",
            "Cube.017_primitive1",
            "Cube.020_primitive2",
            "Cube.021_primitive1",
          ].map((name) => this._experience.scene.getMeshByName(name));

          m.forEach((mesh) => {
            waterMaterial.addToRenderList(mesh);
          });

          //   waterPlane.visibility = 0
          //   waterPlane.material.wireframe = true;
        }
      });
  }
}
