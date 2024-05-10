import {
  Engine,
  Scene,
  FreeCamera,
  ICameraInput,
  KeyboardEventTypes,
  Nullable,
  Observer,
  UniversalCamera,
  Vector3,
  KeyboardInfo,
  AbstractEngine,
} from "@babylonjs/core";
import nipplejs, { JoystickManager } from "nipplejs";

class CustomKeyboardMoveInput implements ICameraInput<FreeCamera> {
  private keysUp: number[] = [];
  private keysUpward: number[] = [];
  private keysDown: number[] = [];
  private keysDownward: number[] = [];
  private keysLeft: number[] = [];
  private keysRight: number[] = [];

  private rotationSpeed: number;

  private _keys: number[] = [];

  private _scene: Nullable<Scene> = null;
  private _engine: Nullable<Engine> = null;

  private _onCanvasBlurObserver: Nullable<Observer<Engine>> = null;
  private _onKeyboardObserver: Nullable<Observer<KeyboardInfo>> = null;
  private _onDocumentObserver: Nullable<() => void> = null;

  public camera: UniversalCamera;

  private _mobileCompatible: boolean = false;

  private movementVector: Vector3 = new Vector3();

  private joystick: Nullable<JoystickManager> = null;
  private isMoving = false;
  private joystickUIWrapper: HTMLElement;

  public set mobileCompatible(value: boolean) {
    if (this.joystick) {
      this.joystick.destroy();
    }

    if (value) {
      this.joystick = nipplejs.create({
        zone: this.joystickUIWrapper,
        mode: "static",
        position: { left: "50%", top: "50%" },
        color: "white",
      });

      this.joystick.on("move", (e, data) => {
        const vector = data.vector;
        this.movementVector.x = vector.x;
        this.movementVector.z = vector.y;
      });

      this.joystick.on("end", () => {
        this.movementVector.x = 0;
        this.movementVector.z = 0;
        this.isMoving = false;
      });

      this.joystick.on("start", () => {
        this.isMoving = true;
      });
    }

    this._mobileCompatible = value;
  }

  constructor(
    camera: UniversalCamera,
    { joystickUIWrapper }: { joystickUIWrapper: HTMLElement }
  ) {
    this.camera = camera;

    this.keysUp = [38, 87];

    this.keysUpward = [33];

    this.keysDown = [40, 83];

    this.keysDownward = [34];

    this.keysLeft = [37, 65];

    this.keysRight = [39, 68];

    this.rotationSpeed = 0.5;

    this._keys = [];
    this.joystickUIWrapper = joystickUIWrapper;
  }

  attachControl(noPreventDefault: boolean) {
    if (this._onCanvasBlurObserver) {
      return;
    }
    this._scene = this.camera.getScene();

    this._engine = this._scene?.getEngine() as Engine;

    this._onCanvasBlurObserver =
      this._engine?.onCanvasBlurObservable.add(() => {
        this._keys.length = 0;
      }) || null;

    //to make sure controller key doesn't get stuck
    this._onDocumentObserver = () => {
      this._keys.length = 0;
    };
    document.addEventListener("blur", this._onDocumentObserver);
    document.addEventListener("pointerup", this._onDocumentObserver);

    this._onKeyboardObserver = this._scene?.onKeyboardObservable.add((info) => {
      const evt = info.event;

      if (!evt.metaKey) {
        if (info.type === KeyboardEventTypes.KEYDOWN) {
          if (
            this.keysUp.indexOf(evt.keyCode) !== -1 ||
            this.keysDown.indexOf(evt.keyCode) !== -1 ||
            this.keysLeft.indexOf(evt.keyCode) !== -1 ||
            this.keysRight.indexOf(evt.keyCode) !== -1 ||
            this.keysUpward.indexOf(evt.keyCode) !== -1 ||
            this.keysDownward.indexOf(evt.keyCode) !== -1
          ) {
            const index = this._keys.indexOf(evt.keyCode);
            if (index === -1) {
              this._keys.push(evt.keyCode);
            }
            if (!noPreventDefault) {
              evt.preventDefault();
            }
          }
        } else {
          if (
            this.keysUp.indexOf(evt.keyCode) !== -1 ||
            this.keysDown.indexOf(evt.keyCode) !== -1 ||
            this.keysLeft.indexOf(evt.keyCode) !== -1 ||
            this.keysRight.indexOf(evt.keyCode) !== -1 ||
            this.keysUpward.indexOf(evt.keyCode) !== -1 ||
            this.keysDownward.indexOf(evt.keyCode) !== -1
          ) {
            const index = this._keys.indexOf(evt.keyCode);
            if (index >= 0) {
              this._keys.splice(index, 1);
            }
            if (!noPreventDefault) {
              evt.preventDefault();
            }
          }
        }
      }
    });
  }
  /**
   * Detach the current controls from the specified dom element.
   */
  detachControl() {
    if (this._scene) {
      if (this._onKeyboardObserver) {
        this._scene.onKeyboardObservable.remove(this._onKeyboardObserver);
      }
      if (this._onCanvasBlurObserver) {
        this._engine?.onCanvasBlurObservable.remove(
          this._onCanvasBlurObserver as Observer<AbstractEngine>
        );
      }
      this._onKeyboardObserver = null;
      this._onCanvasBlurObserver = null;
      if (this._onDocumentObserver) {
        document.removeEventListener("blur", this._onDocumentObserver);
        document.removeEventListener("pointerup", this._onDocumentObserver);
      }
    }
    this._keys.length = 0;
  }

  checkInputs() {
    if (this._onKeyboardObserver) {
      const camera = this.camera;

      if (this._mobileCompatible) {
        if (this.isMoving) {
          const speed = camera._computeLocalCameraSpeed();
          const x = this.movementVector.x * speed;
          const z = this.movementVector.z * speed;
          if (camera.getScene().useRightHandedSystem) {
            camera._localDirection.z *= -1;
          }
          camera._localDirection.copyFromFloats(x, this.movementVector.y, z);
          camera.getViewMatrix().invertToRef(camera._cameraTransformMatrix);
          Vector3.TransformNormalToRef(
            camera._localDirection,
            camera._cameraTransformMatrix,
            camera._transformedDirection
          );
          camera.cameraDirection.addInPlace(camera._transformedDirection);
        }
        return;
      }
      // Keyboard
      for (let index = 0; index < this._keys.length; index++) {
        const keyCode = this._keys[index];
        if (!keyCode) return;
        const speed = camera._computeLocalCameraSpeed();

        if (this.keysLeft.indexOf(keyCode) !== -1) {
          camera._localDirection.copyFromFloats(-speed, 0, 0);
        } else if (this.keysUp.indexOf(keyCode) !== -1) {
          camera._localDirection.copyFromFloats(0, 0, speed);
        } else if (this.keysRight.indexOf(keyCode) !== -1) {
          camera._localDirection.copyFromFloats(speed, 0, 0);
        } else if (this.keysDown.indexOf(keyCode) !== -1) {
          camera._localDirection.copyFromFloats(0, 0, -speed);
        } else if (this.keysUpward.indexOf(keyCode) !== -1) {
          camera._localDirection.copyFromFloats(0, speed, 0);
        } else if (this.keysDownward.indexOf(keyCode) !== -1) {
          camera._localDirection.copyFromFloats(0, -speed, 0);
        }
        if (camera.getScene().useRightHandedSystem) {
          camera._localDirection.z *= -1;
        }
        camera.getViewMatrix().invertToRef(camera._cameraTransformMatrix);
        Vector3.TransformNormalToRef(
          camera._localDirection,
          camera._cameraTransformMatrix,
          camera._transformedDirection
        );
        camera.cameraDirection.addInPlace(camera._transformedDirection);
      }
    }
  }

  getClassName() {
    return "CustomFreeCameraKeyboardMoveInput";
  }
  _onLostFocus() {
    this._keys.length = 0;
  }

  getSimpleName() {
    return "keyboard";
  }

  _getLocalRotation() {
    if (!this._engine) return 0;
    let rotation = (this.rotationSpeed * this._engine.getDeltaTime()) / 1000;
    if (this.camera.getScene().useRightHandedSystem) {
      rotation *= -1;
    }
    if (
      this.camera.parent &&
      this.camera.parent._getWorldMatrixDeterminant() < 0
    ) {
      rotation *= -1;
    }
    return rotation;
  }
}

export class CameraControl {
  public keyboardControls: null | CustomKeyboardMoveInput = null;
  private scene: Scene;

  private mobileCompatible = false;

  private joystickUIWrapper: HTMLElement;

  constructor(
    { joystickUIWrapper }: { joystickUIWrapper: HTMLElement },
    scene: Scene
  ) {
    this.scene = scene;
    this.joystickUIWrapper = joystickUIWrapper;
  }

  public enableKeyboardControls = () => {
    const currentCamera = this.scene.activeCamera;
    if (!currentCamera)
      throw new Error(
        "There is no active camera for scene, Please initialize the camera for current scene"
      );
    if (!(currentCamera instanceof UniversalCamera)) {
      throw new Error(
        "This camera control is compatible with Universal Camera only, "
      );
    }

    if (currentCamera && currentCamera instanceof UniversalCamera) {
      currentCamera.inputs.attached.keyboard &&
        currentCamera.inputs.remove(currentCamera.inputs.attached.keyboard);

      if (currentCamera.inputs.attached.mouse) {
        //@ts-expect-error : because babylon js...
        currentCamera.inputs.attached.mouse.touchEnabled = true;
      }
      currentCamera.inputs.attached.touch &&
        currentCamera.inputs.remove(currentCamera.inputs.attached.touch);
    }

    if (!this.keyboardControls) {
      this.keyboardControls = new CustomKeyboardMoveInput(currentCamera, {
        joystickUIWrapper: this.joystickUIWrapper,
      });
      if (this.mobileCompatible) {
        this.keyboardControls.mobileCompatible = true;
      } else {
        this.keyboardControls.mobileCompatible = false;
      }
    }
    currentCamera.inputs.add(this.keyboardControls);
  };

  public disableKeyboardControls = () => {
    const currentCamera = this.scene.activeCamera;
    if (!currentCamera || !this.keyboardControls) return;
    this.keyboardControls.mobileCompatible = false;
    currentCamera.inputs.remove(this.keyboardControls);
  };

  public enableJoystick = () => {
    this.mobileCompatible = true;
    if (this.keyboardControls) {
      this.keyboardControls.mobileCompatible = true;
    }
  };

  public disableJoystick = () => {
    this.mobileCompatible = false;
    if (this.keyboardControls) {
      this.keyboardControls.mobileCompatible = false;
    }
  };
}

type DeviceType = "Mobile" | "Tablet" | "Desktop";
type ScreenOrientationType = "Landscape" | "Portrait";

export function getDeviceType(): DeviceType {
  const ua = navigator.userAgent;
  if (/mobile/i.test(ua)) {
    return "Mobile";
  } else if (
    /tablet/i.test(ua) ||
    (window.matchMedia &&
      window.matchMedia("(max-device-width: 1200px)").matches)
  ) {
    return "Tablet";
  } else {
    return "Desktop";
  }
}

export function getScreenOrientation(): ScreenOrientationType {
  const width = screen.width;
  const height = screen.height;

  if (width > height) {
    return "Landscape";
  } else {
    return "Portrait";
  }
}
