import {
  AbstractMesh,
  ArcRotateCamera,
  Color3,
  Engine,
  Matrix,
  Nullable,
  Scene,
  SceneLoader,
  ShaderMaterial,
  UniversalCamera,
  Vector3,
} from "@babylonjs/core";

import "@babylonjs/loaders/glTF";
import { HologramMaterial } from "./helpers/HologramMaterial";
import { Water } from "./helpers/Water";
import { CameraControl } from "./helpers/CustomCameraInputs";

export class Experience {
  private _canvas: HTMLCanvasElement;

  private _engine: Engine;
  public scene: Scene;

  private _camera: Nullable<ArcRotateCamera | UniversalCamera> = null;

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;

    this._engine = new Engine(this._canvas, true);
    this.scene = new Scene(this._engine);

    this.initUniversalCamera({});

    this.scene.createDefaultLight();

    this.pointerDownEvent(this.scene);

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
        {
          color: new Color3(0.1, 1, 0.3),
          numberOfStripes: 10,
          stripeSpeed: 1,
          glitchStrength: 0.5,
        },
        this.scene
      );

      model.material = hologramMaterial as ShaderMaterial;
    });

    const div = document.getElementById("controls-ui");
    if (!div) throw new Error("DEFINE DIV");
    const cameraController = new CameraControl(
      { joystickUIWrapper: div },
      this.scene
    );

    cameraController.enableKeyboardControls()
    cameraController.enableJoystick()


    // const water = new Water(this);

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
      0,
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
    this._camera.speed = 0.2;
    this._camera.attachControl();
  };
}
