import {
  CubeTexture,
  Effect,
  HDRCubeTexture,
  Mesh,
  MeshBuilder,
  Nullable,
  Scene,
  ShaderMaterial,
  StandardMaterial,
  VertexBuffer,
  VertexData,
} from "@babylonjs/core";
import { MeshTangent } from "./MeshTangent";

Effect.ShadersStore["interiorVertexShader"] = `
            precision highp float;

            attribute vec3 position;
            attribute vec3 normal;
            attribute vec2 uv;
            attribute vec4 tangent;

            uniform mat4 world;
            uniform mat4 view;
            uniform mat4 projection;

            varying vec3 vViewDirTangent;
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vTangent;
            
            void main() {
                vUv = uv;
                mat4 modelViewMatrix = view * world;
                vec4 modelNormal = modelViewMatrix * vec4(normal, 0.0);
                vec4 modelTangent = modelViewMatrix * vec4(tangent.xyz, 0.0);
                vec3 vNormal = modelNormal.xyz;
                vTangent = modelTangent.xyz;
                vec3 vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
                mat3 mTBN = transpose(mat3(vTangent, vBitangent, vNormal));
                vec4 mvPos = modelViewMatrix * vec4( position, 1.0 );
                vec3 viewDir = -mvPos.xyz;
                vViewDirTangent = mTBN * viewDir;
                gl_Position = projection * mvPos;
            }
`;

Effect.ShadersStore["interiorFragmentShader"] = `
            precision highp float;

            varying vec3 vPosition;
            varying vec3 vNormal;
            varying vec3 vTangent;
            varying vec2 vUv;
            varying vec3 vViewDirTangent;

            uniform samplerCube cubeMap;

            float min3 (vec3 v) {
                return min (min (v.x, v.y), v.z);
            }

            void main() {
                vec2 uv = fract(vUv * vec2(1.0, 1.0)); 
                vec3 sampleDir = normalize(vViewDirTangent);

                sampleDir *= vec3(-1.,-1.,1.);
                vec3 viewInv = 1. / sampleDir;

                vec3 pos = vec3(uv * 2.0 - 1.0, -1.0);
    
                float fmin = min3(abs(viewInv) - viewInv * pos);
                sampleDir = sampleDir * fmin + pos;

                // gl_FragColor = vec4(vTangent, 1.0);
                if(gl_FrontFacing){
                    gl_FragColor = texture(cubeMap, sampleDir);
                }else{
                    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
                }
            }
`;

export class InteriorMappingMaterial {
  constructor(name: string, {}: {}, scene: Scene) {
    const material = new ShaderMaterial(
      name,
      scene,
      {
        vertex: "interior",
        fragment: "interior",
      },
      {
        attributes: ["position", "normal", "uv", "tangent"],
        uniforms: [
          "world",
          "worldView",
          "worldViewProjection",
          "view",
          "projection",
          "viewProjection",
          "uTime",
          "uCameraPosition",
          "cubeMap",
        ],
        needAlphaBlending: true,
      }
    );

    material.backFaceCulling = false;
    const hdrTexture2 = new CubeTexture(
      "https://www.babylonjs-playground.com/textures/TropicalSunnyDay",
      scene
    );
    const hdrTexture = new CubeTexture("/cube.dds", scene);
    const a = new HDRCubeTexture("/room.hdr", scene, 1024, false, false);

    const c = CubeTexture.CreateFromImages(
      [
        "/room/px.jpg",
        "/room/py.jpg",
        "/room/pz.jpg",
        "/room/nx.jpg",
        "/room/ny.jpg",
        "/room/nz.jpg",
      ],
      scene
    );

    material.setTexture("cubeMap", c);

    // const cube = MeshBuilder.CreateBox("cube", { size: 1 }, scene);

    // var skyboxMaterial = new StandardMaterial("skyBox", scene);
    // skyboxMaterial.backFaceCulling = false;
    // skyboxMaterial.reflectionTexture = c;
    // skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
    // skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
    // skyboxMaterial.specularColor = new Color3(0, 0, 0);

    // cube.material = skyboxMaterial;

    // material.backFaceCulling = false;

    return material;
  }
}

export class InteriorMapping {
  private scene: Scene;

  public plane: Mesh;

  private _dummyPlane: Nullable<Mesh> = null;

  constructor(scene: Scene, mesh?: Mesh) {
    this.scene = scene;
    this._dummyPlane = mesh || null;
    this.plane = this.createPlane("plane", { size: 4 }, this.scene);
  }

  private createPlane = (
    name: string,
    { size }: { size: number },
    scene: Scene
  ) => {
    const dummyPlane =
      this._dummyPlane ||
      MeshBuilder.CreatePlane("plane", { size: size }, this.scene);

    // dummyPlane.isVisible = false;

    const vertexData = new VertexData();

    vertexData.positions = dummyPlane.getVerticesData(
      VertexBuffer.PositionKind,
      undefined,
      true
    );

    vertexData.normals = dummyPlane.getVerticesData(
      VertexBuffer.NormalKind,
      undefined,
      true
    );

    vertexData.uvs = dummyPlane.getVerticesData(
      VertexBuffer.UVKind,
      undefined,
      true
    );

    vertexData.indices = dummyPlane.getIndices(undefined, true);

    const plane = new MeshTangent(name, scene);
    vertexData.applyToMesh(plane);
    plane.computeTangents();
    plane.position.copyFrom(dummyPlane.position);
    const material = new StandardMaterial("mat", scene);
    const mat = new InteriorMappingMaterial("interior", {}, scene);
    plane.material = mat as ShaderMaterial;
    // plane.isVisible = false;
    // material.backFaceCulling = false;
    return plane;
  };
}
