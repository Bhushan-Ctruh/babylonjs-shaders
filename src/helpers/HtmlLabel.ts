import { AbstractMesh, Scene, Vector3 } from "@babylonjs/core";

const isInBehindOfCamera = (
  pointPosition: Vector3,
  cameraPosition: Vector3,
  cameraDirection: Vector3
) => {
  const pointDirection = pointPosition.subtract(cameraPosition).normalize();
  const dot = Vector3.Dot(pointDirection, cameraDirection);
  const angleRadians = Math.acos(dot);
  return angleRadians > Math.PI / 2;
};

export class HtmlLabel {
  private htmlElement: HTMLElement;
  private position: Vector3 | AbstractMesh;
  private scene: Scene;

  private observableCleanUp: () => void;

  constructor(
    htmlElement: HTMLElement,
    {
      position,
      center,
      onCameraMoveOnly,
    }: {
      position: Vector3 | AbstractMesh;
      center?: boolean;
      onCameraMoveOnly?: boolean;
    },
    scene: Scene
  ) {
    this.htmlElement = htmlElement;
    this.position = position;
    this.scene = scene;

    this.observableCleanUp = this.attachUIToMesh(
      this.htmlElement,
      onCameraMoveOnly
    );

    this.htmlElement.style.position = "fixed";
    document.body.appendChild(this.htmlElement);

    if (center) {
      this.htmlElement.style.transform = "translate(-50%, -50%)";
    }
  }

  public setPosition(position: Vector3) {
    if (this.position instanceof Vector3) {
      this.position = position;
    } else {
      this.position.position = position;
    }
  }

  private projectPointToScreenSpace = () => {
    const point =
      this.position instanceof Vector3
        ? this.position
        : this.position.getAbsolutePosition();

    const isPointBehindCamera = isInBehindOfCamera(
      point,
      this.scene.activeCamera!.position,
      this.scene.activeCamera!.getForwardRay().direction
    );

    if (isPointBehindCamera) {
      return { px: -1000000000, py: -1000000000 };
    }

    const posInViewProj = Vector3.TransformCoordinates(
      point,
      this.scene.getTransformMatrix()
    );
    const screenCoords = posInViewProj
      .multiplyByFloats(0.5, -0.5, 1.0)
      .add(new Vector3(0.5, 0.5, 0.0))
      .multiplyByFloats(
        this.scene.getEngine().getRenderWidth(),
        this.scene.getEngine().getRenderHeight(),
        1
      );

    let px = screenCoords.x;
    let py = screenCoords.y;

    return { px, py };
  };

  public attachUIToMesh = (root: HTMLElement, onCameraMoveOnly?: boolean) => {
    const camera = this.scene.activeCamera;

    if (!camera) {
      throw new Error("Camera not found");
    }

    const observableCallback = () => {
      const position = this.projectPointToScreenSpace();
      root.style.left = position.px + "px";
      root.style.top = position.py + "px";
    };

    window.addEventListener("resize", observableCallback);

    if (onCameraMoveOnly) {
      observableCallback();
      camera.onViewMatrixChangedObservable.add(observableCallback);
      return () => {
        camera.onViewMatrixChangedObservable.removeCallback(observableCallback);
        window.removeEventListener("resize", observableCallback);
      };
    } else {
      this.scene.onBeforeRenderObservable.add(observableCallback);
      return () => {
        this.scene.onBeforeRenderObservable.removeCallback(observableCallback);
        window.removeEventListener("resize", observableCallback);
      };
    }
  };

  public dispose = () => {
    this.htmlElement.remove();
    this.observableCleanUp();
  };
}
