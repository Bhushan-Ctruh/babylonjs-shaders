import {
  AbstractMesh,
  ArcRotateCamera,
  Color3,
  Engine,
  Matrix,
  Mesh,
  MeshBuilder,
  Nullable,
  Scene,
  SceneLoader,
  ShaderMaterial,
  Texture,
  UniversalCamera,
  Vector3,
} from "@babylonjs/core";

import "@babylonjs/loaders/glTF";
import { HologramMaterial } from "./helpers/HologramMaterial";
// import { Water } from "./helpers/Water";
import { CameraControl } from "./helpers/CustomCameraInputs";
import { ShadingMaterial } from "./helpers/ShadingMaterial";
import { FireMaterial } from "@babylonjs/materials";
import { SmokeMaterial } from "./helpers/SmokeMaterial";
import { GUIScreen } from "./helpers/GUI";
import { RoundedRect } from "./helpers/RoundedRect";
import { HtmlLabel } from "./helpers/HtmlLabel";

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

    // this._loadModel("", "", "suzanne.glb", this.scene).then((meshes) => {
    //   const model = meshes[1];

    //   if (!model) return;

    //   const rotation = model.rotationQuaternion?.toEulerAngles();

    //   if (rotation) {
    //     model.rotation = rotation;
    //     model.rotationQuaternion = null;
    //   }

    //   const startTime = Date.now();

    //   this.scene.onBeforeRenderObservable.add(() => {
    //     const elapsedTime = Date.now() - startTime;
    //     model.rotation.y = elapsedTime * 0.0001;
    //   });

    //   const hologramMaterial = new HologramMaterial(
    //     "demo-material",
    //     {
    //       color: new Color3(0.1, 1, 0.3),
    //       numberOfStripes: 10,
    //       stripeSpeed: 1,
    //       glitchStrength: 0.5,
    //     },
    //     this.scene
    //   );

    //   const shadingMaterial = new ShadingMaterial("light-material", this.scene);

    //   model.material = hologramMaterial as ShaderMaterial;
    //   model.material = shadingMaterial as ShaderMaterial;
    // });

    // const plane = MeshBuilder.CreatePlane("demo", {}, this.scene);

    // const fire = new FireMaterial("fire", this.scene);

    // fire.diffuseTexture = new Texture(
    //   "https://playground.babylonjs.com/textures/fire.png",
    //   this.scene
    // );
    // fire.distortionTexture = new Texture(
    //   "https://playground.babylonjs.com/textures/distortion.png",
    //   this.scene
    // );
    // fire.opacityTexture = new Texture(
    //   "https://playground.babylonjs.com/textures/candleopacity.png",
    //   this.scene
    // );
    // fire.speed = 5.0;

    // plane.billboardMode = Mesh.BILLBOARDMODE_Y;

    // plane.material = fire;

    // const plane = MeshBuilder.CreatePlane("demo", {size: 4}, this.scene);

    // new GUIScreen(this.scene);


    // this.initArcRotateCamera({});
    this.initUniversalCamera({})

    const box = MeshBuilder.CreateBox("box", { size: 1 }, this.scene);

    // const boxCorner = box.getBoundingInfo().boundingBox.maximumWorld;

    const sphere = MeshBuilder.CreateSphere(
      "sphere",
      { diameter: 0.1 },
      this.scene
    );

    box.addChild(sphere);

    sphere.position.x = 0.5;
    sphere.position.y = 0.5;
    sphere.position.z = -0.5;

    const div = document.createElement("div");
    div.innerText = "Hello World";
    div.style.background = "white";
    div.style.padding = "5px 10px";
    div.style.borderRadius = "5px";
    div.style.fontFamily = "sans-serif";

    new HtmlLabel(div, { position: sphere, center: true, }, this.scene);

    this.scene.onBeforeRenderObservable.add(() => {
      // box.position.x = (Math.sin(Date.now() * 0.001) - 0.5 )* 3;
    });

    // const div = document.getElementById("controls-ui");
    // if (!div) throw new Error("DEFINE DIV");
    // const cameraController = new CameraControl(
    //   { joystickUIWrapper: div },
    //   this.scene
    // );

    // cameraController.enableKeyboardControls()
    // cameraController.enableJoystick()

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
    this._camera.speed = 0.2;
    this._camera.attachControl();
  };
}
