import {
  AbstractMesh,
  ArcRotateCamera,
  Color3,
  Constants,
  Engine,
  Matrix,
  Mesh,
  MeshBuilder,
  Nullable,
  Quaternion,
  RawTexture,
  Scene,
  SceneLoader,
  ShaderMaterial,
  StandardMaterial,
  UniversalCamera,
  Vector3,
  VertexBuffer,
} from "@babylonjs/core";

import "@babylonjs/loaders/glTF";
import { WaterMaterial, WaterPipeMaterial } from "./helpers/waterMaterial";
// import { BatchedMesh } from "./helpers/BatchedMesh";
// import {
//   InteriorMapping,
//   InteriorMappingMaterial,
// } from "./helpers/InteriorMapping/InteriorMapping";
// import { computeTangents } from "./helpers/InteriorMapping/MeshTangent";
// import { BatchedMesh } from "./helpers/MergeMesh";

export class Experience {
  private _canvas: HTMLCanvasElement;

  private _engine: Engine;
  public scene: Scene;

  private _camera: Nullable<ArcRotateCamera | UniversalCamera> = null;

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;

    this._engine = new Engine(this._canvas, true);
    this.scene = new Scene(this._engine);

    // this.initUniversalCamera({});

    this.scene.createDefaultLight();

    this.pointerDownEvent(this.scene);

    this.initArcRotateCamera({});

    const plane = MeshBuilder.CreateGround(
      "plane",
      { width: 4, height: 4, subdivisions: 20 },
      this.scene
    );

    const material = new WaterMaterial("water", this.scene);
    // material.wireframe = true;
    plane.material = material;

    // const cylinder = MeshBuilder.CreateCylinder(
    //   "cylinder",
    //   { diameter: 0.7, height: 1, subdivisions: 10 },
    //   this.scene
    // );

    // cylinder.position.y += 0.5;
    // // cylinder.rotation.x = Math.PI / 2;

    // const pipeMat = new WaterPipeMaterial("pipeMat", this.scene);
    // // pipeMat.wireframe = true;
    // cylinder.material = pipeMat;

    this._GameLoop(this._engine, this.scene);
  }

  private _GameLoop = (
    engine: Engine = this._engine,
    scene: Scene = this.scene
  ) => {
    engine.runRenderLoop(() => {
      scene.getEngine().setSize(window.innerWidth, window.innerHeight);
      scene.getEngine().resize();
      scene.render();
    });
  };

  public _loadModel = (
    meshNames: string,
    rootUrl: string,
    fileName: string,
    scene: Scene
  ) => {
    return new Promise<AbstractMesh[]>((resolve, reject) => {
      SceneLoader.ImportMesh(
        meshNames,
        rootUrl,
        fileName,
        scene,
        (meshes) => {
          if (!meshes[0]) {
            console.warn("no mesh found in glb");
            reject("No mesh found in model");
          }

          resolve(meshes);
        },
        undefined,
        (scene, error) => {
          reject(error);
        },
        ".glb"
      );
    });
  };

  private pointerDownEvent = (scene: Scene) => {
    scene.onPointerDown = () => {
      const ray = scene.createPickingRay(
        scene.pointerX,
        scene.pointerY,
        Matrix.Identity(),
        scene._activeCamera
      );
      const hit = scene.pickWithRay(ray);

      if (!hit?.pickedMesh) {
        return;
      }

      console.log({ meshName: hit.pickedMesh.name, hit });
    };
  };

  private initArcRotateCamera = ({ position }: { position?: Vector3 }) => {
    this._camera?.dispose();
    this._camera = new ArcRotateCamera(
      "Camera",
      -Math.PI / 2,
      Math.PI / 2,
      10,
      position || new Vector3(0, 0, 0),
      this.scene
    );
    this._camera.attachControl();
  };

  private initUniversalCamera = ({ position }: { position?: Vector3 }) => {
    this._camera?.dispose();
    this._camera = new UniversalCamera(
      "Camera",
      position || new Vector3(0, 0, -4),
      this.scene
    );
    // this._camera.speed = 40;
    this._camera.attachControl();
  };
}
