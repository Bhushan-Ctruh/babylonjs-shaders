import {
  AbstractMesh,
  ArcRotateCamera,
  Color3,
  Engine,
  Scene,
  SceneLoader,
  ShaderMaterial,
  Vector3,
} from "@babylonjs/core";

import "@babylonjs/loaders/glTF";
import { HologramMaterial } from "./helpers/HologramMaterial";

export class Experience {
  private _canvas: HTMLCanvasElement;

  private _engine: Engine;
  public scene: Scene;

  private _camera: ArcRotateCamera;

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;

    this._engine = new Engine(this._canvas, true);
    this.scene = new Scene(this._engine);

    this._camera = new ArcRotateCamera(
      "Camera",
      0,
      Math.PI / 2,
      10,
      new Vector3(0, 0, 0),
      this.scene
    );

    this._camera.attachControl();

    this.scene.createDefaultLight();

    this._loadModel("", "", "suzanne.glb", this.scene).then((meshes) => {
      const model = meshes[1];

      if (!model) return;

      const rotation = model.rotationQuaternion?.toEulerAngles();

      if (rotation) {
        model.rotation = rotation;
        model.rotationQuaternion = null;
      }

      const startTime = Date.now();

      this.scene.onBeforeRenderObservable.add(() => {
        const elapsedTime = Date.now() - startTime;
        model.rotation.y = elapsedTime * 0.0001;
      });

      const hologramMaterial = new HologramMaterial(
        "demo-material",
        { color: new Color3(0.1, 1, 0.3), numberOfStripes: 10, stripeSpeed: 1, glitchStrength: 0.5 },
        this.scene
      );

      model.material = hologramMaterial as ShaderMaterial;
    });

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

  private _loadModel = (
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
}
