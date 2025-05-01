import {
  AbstractMesh,
  Camera,
  Matrix,
  Nullable,
  Scene,
  Vector3,
} from "@babylonjs/core";

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

const labelScale = (camera: Camera, position: Vector3) => {
  const vFOV = camera.fov;
  const dist = Vector3.Distance(position, camera.position);
  const scaleFOV = 2 * Math.tan(vFOV / 2) * dist;
  return 1 / scaleFOV;
};

const v_ = new Vector3(0.5, 0.5, 0.0);

type CSSStyles = Partial<CSSStyleDeclaration>;

function applyStyles(element: HTMLElement, styles: CSSStyles): void {
  for (const [key, value] of Object.entries(styles)) {
    // TypeScript ensures that key is a valid CSS property
    if (value !== undefined) {
      //@ts-expect-error
      element.style[key as keyof CSSStyleDeclaration] = value;
    }
  }
}

const epsilon = (value: number) => (Math.abs(value) < 1e-10 ? 0 : value);

function getCSSMatrix(matrix: Matrix, multipliers: number[], prepend = "") {
  let matrix3d = "matrix3d(";
  for (let i = 0; i !== 16; i++) {
    matrix3d += epsilon(multipliers[i] * matrix.m[i]) + (i !== 15 ? "," : ")");
  }
  return prepend + matrix3d;
}

const getCameraCSSMatrix = ((multipliers: number[]) => {
  return (matrix: Matrix) => getCSSMatrix(matrix, multipliers);
})([1, -1, 1, 1, 1, -1, 1, 1, 1, -1, 1, 1, 1, -1, 1, 1]);

const getObjectCSSMatrix = ((scaleMultipliers: (n: number) => number[]) => {
  return (matrix: Matrix, factor: number) =>
    getCSSMatrix(matrix, scaleMultipliers(factor), "translate(-50%,-50%)");
})((f: number) => [
  1 / f,
  1 / f,
  1 / f,
  1,
  -1 / f,
  -1 / f,
  -1 / f,
  -1,
  1 / f,
  1 / f,
  1 / f,
  1,
  1,
  1,
  1,
  1,
]);

const getOuterTransformStyle = (
  size: { width: number; height: number },
  transform?: boolean,
  center?: boolean
): CSSStyles => {
  if (transform) {
    return {
      position: "absolute",
      top: "0",
      left: "0",
      width: `${size.width}px`,
      height: `${size.height}px`,
      transformStyle: "preserve-3d",
      pointerEvents: "none",
    };
  } else {
    return {
      position: "absolute",
      transform: center ? "translate3d(-50%,-50%,0)" : "none",
    };
  }
};

const getInnerTransformStyle = (pointerEvents: string): CSSStyles => {
  return { position: "absolute", pointerEvents };
};

export class HTML2DLabel extends AbstractMesh {
  private htmlElement: HTMLElement;

  private observableCleanUp: () => void;

  private el: HTMLElement;

//   private oldPosition = new Vector3(0, 0, 0);
  private transformOuterRef: Nullable<HTMLDivElement> = null;
  private transformInnerRef: Nullable<HTMLDivElement> = null;
  private wrapper = document.createElement("div");

  private settings: {
    center?: boolean;
    onCameraMoveOnly?: boolean;
    distanceFactor?: number;
    transform?: boolean;
  };

  constructor(
    name: string,
    {
      htmlElement,
      center,
      onCameraMoveOnly,
      el,
      distanceFactor,
      transform,
    }: {
      htmlElement: HTMLElement;
      center?: boolean;
      onCameraMoveOnly?: boolean;
      el?: string;
      distanceFactor?: number;
      transform?: boolean;
    },
    scene: Scene
  ) {
    super(name, scene);
    this.htmlElement = htmlElement;

    this.el = document.createElement(el || "div");

    this.settings = {
      center,
      onCameraMoveOnly,
      distanceFactor,
      transform,
    };

    this.observableCleanUp = this.attachUIToMesh(
      this.el,
      this.settings.onCameraMoveOnly
    );

    this.el.style.position = "absolute";
    document.body.appendChild(this.el);

    if (this.settings.transform) {
      this.el.style.cssText = `position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;`;
    } else {
      const { px, py } = this.projectPointToScreenSpace();
      this.el.style.cssText = `position:absolute;top:0;left:0;transform:translate3d(${px}px,${py}px,0);transform-origin:0 0;`;
    }

    if (this.settings.transform) {
      this.transformOuterRef = document.createElement("div");
      this.transformInnerRef = document.createElement("div");
      const outerStyles = getOuterTransformStyle(
        {
          width: this._scene.getEngine().getRenderWidth(),
          height: this._scene.getEngine().getRenderHeight(),
        },
        this.settings.transform,
        this.settings.center
      );
      const innerStyles = getInnerTransformStyle("all");
      applyStyles(this.transformOuterRef, outerStyles);
      applyStyles(this.transformInnerRef, innerStyles);

      this.el.appendChild(this.transformOuterRef);
      this.transformOuterRef.appendChild(this.transformInnerRef);
      this.transformInnerRef.appendChild(this.wrapper);
    } else {
      this.el.appendChild(this.wrapper);
      if (this.settings.center) {
        this.wrapper.style.transform = "translate(-50%, -50%)";
      }
    }

    this.wrapper.appendChild(this.htmlElement);
  }

  private projectPointToScreenSpace = () => {
    const camera = this._scene.activeCamera!;

    const point = this.getAbsolutePosition();

    const isPointBehindCamera = isInBehindOfCamera(
      point,
      camera.position,
      camera.getForwardRay().direction
    );

    if (isPointBehindCamera) {
      return { px: -1000000000, py: -1000000000 };
    }

    const posInViewProj = Vector3.TransformCoordinates(
      point,
      this._scene.getTransformMatrix()
    );
    const screenCoords = posInViewProj
      .multiplyByFloats(0.5, -0.5, 1.0)
      .add(v_)
      .multiplyByFloats(
        this._scene.getEngine().getRenderWidth(),
        this._scene.getEngine().getRenderHeight(),
        1
      );

    let px = screenCoords.x;
    let py = screenCoords.y;

    const scale =
      this.settings.distanceFactor === undefined
        ? 1
        : labelScale(camera, point) * this.settings.distanceFactor;

    return { px, py, scale };
  };

  public attachUIToMesh = (root: HTMLElement, onCameraMoveOnly?: boolean) => {
    const camera = this._scene.activeCamera;

    if (!camera) {
      throw new Error("Camera not found");
    }

    const observableCallback = () => {
      const position = this.projectPointToScreenSpace();

      if (this.settings.transform) {
        const [widthHalf, heightHalf] = [
          this._scene.getEngine().getRenderWidth() / 2,
          this._scene.getEngine().getRenderHeight() / 2,
        ];

        const fov = camera.getProjectionMatrix().m[5] * heightHalf;

        const inverseMatrix = camera.getWorldMatrix()

        const cameraMatrix = getCameraCSSMatrix(inverseMatrix);
        const cameraTransform = `translateZ(${fov}px)`;

        let matrix = this.getWorldMatrix();

        this.el.style.width = this._scene.getEngine().getRenderWidth() + "px";
        this.el.style.height = this._scene.getEngine().getRenderHeight() + "px";
        this.el.style.perspective = `${fov}px`;

        if (this.transformInnerRef && this.transformOuterRef) {
          this.transformOuterRef.style.transform = `${cameraTransform}${cameraMatrix}translate(${widthHalf}px,${heightHalf}px)`;
          this.transformInnerRef.style.transform = getObjectCSSMatrix(
            matrix,
            1 / ((this.settings.distanceFactor || 10) / 400)
          );
        }
      } else {
        root.style.left = 0 + "px";
        root.style.top = 0 + "px";
        root.style.transform = `translate3d(${position.px}px,${position.py}px,0) scale(${position.scale})`;
      }
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
      this._scene.onBeforeRenderObservable.add(observableCallback);
      return () => {
        this._scene.onBeforeRenderObservable.removeCallback(observableCallback);
        window.removeEventListener("resize", observableCallback);
      };
    }
  };

  public dispose = () => {
    super.dispose();
    this.htmlElement.remove();
    this.el.remove();
    this.observableCleanUp();
  };
}
