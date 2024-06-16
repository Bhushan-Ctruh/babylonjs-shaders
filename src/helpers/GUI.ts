import {
  MeshBuilder,
  RefractionBlock,
  Scene,
  StandardMaterial,
} from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, TextBlock } from "@babylonjs/gui";

export class GUIScreen {
  private _scene: Scene;
  constructor(scene: Scene) {
    this._scene = scene;

    const plane = MeshBuilder.CreatePlane("Screen", { size: 5 }, this._scene);
    const m = new StandardMaterial("test", this._scene);
    m.backFaceCulling = false;
    plane.material = m;

    const ui = AdvancedDynamicTexture.CreateForMesh(plane, 1024, 1024);
    ui.background = "yellow";

    const container = new RefractionBlock("div");

    // ui.addControl(container)

    const button1 = Button.CreateSimpleButton("but1", "Click Me");

    button1.textBlock.fontSize = "100px";
    button1.background = "red";

    button1.widthInPixels = 500;
    button1.heightInPixels = 500;

    button1.topInPixels = 0 - 250;
    button1.leftInPixels = 0 - 250;

    const textBlock = new TextBlock("text", "Hello");

    textBlock.fontSize = "100px";
    textBlock.color = "red";
    

    textBlock.widthInPixels = 500;
    textBlock.heightInPixels = 500;

    textBlock.topInPixels = 0 + 250;
    textBlock.leftInPixels = 0 + 250;

    ui.addControl(textBlock);

    ui.addControl(button1);
  }
}
