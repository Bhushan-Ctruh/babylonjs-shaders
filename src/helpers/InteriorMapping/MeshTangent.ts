import {
  Color3,
  FloatArray,
  IndicesArray,
  Mesh,
  MeshBuilder,
  Nullable,
  Scene,
  Vector2,
  Vector3,
  VertexBuffer,
} from "@babylonjs/core";

export class MeshTangent extends Mesh {
  constructor(name: string, scene: Scene) {
    super(name, scene);
  }

  public computeTangents() {
    const vertexData = this.getVerticesData(VertexBuffer.PositionKind);
    const normalData = this.getVerticesData(VertexBuffer.NormalKind);
    const uvData = this.getVerticesData(VertexBuffer.UVKind);
    const indices = this.getIndices();

    if (!vertexData || !normalData || !uvData || !indices) {
      throw new Error("Mesh is missing required vertex data.");
    }

    const vertexCount = vertexData.length / 3;
    const triangleCount = indices.length / 3;

    const tangentBuffer = new Float32Array(vertexCount * 4);

    const vertices: Vector3[] = [];
    const normals: Vector3[] = [];
    const uvs: Vector2[] = [];

    for (let i = 0; i < vertexCount; i++) {
      vertices.push(
        new Vector3(
          vertexData[i * 3],
          vertexData[i * 3 + 1],
          vertexData[i * 3 + 2]
        )
      );
      normals.push(
        new Vector3(
          normalData[i * 3],
          normalData[i * 3 + 1],
          normalData[i * 3 + 2]
        )
      );
      uvs.push(new Vector2(uvData[i * 2], uvData[i * 2 + 1]));
    }

    const tangent: Vector3[] = new Array(vertexCount).fill(Vector3.Zero());
    const bitangent: Vector3[] = new Array(vertexCount).fill(Vector3.Zero());

    // Calculate tangent and bitangent for each triangle and add to all three vertices.
    for (let k = 0; k < triangleCount; k++) {
      const i0 = indices[k * 3];
      const i1 = indices[k * 3 + 1];
      const i2 = indices[k * 3 + 2];

      const p0 = vertices[i0];
      const p1 = vertices[i1];
      const p2 = vertices[i2];

      const w0 = uvs[i0];
      const w1 = uvs[i1];
      const w2 = uvs[i2];

      const e1 = p1.subtract(p0);
      const e2 = p2.subtract(p0);

      const x1 = w1.x - w0.x;
      const x2 = w2.x - w0.x;
      const y1 = w1.y - w0.y;
      const y2 = w2.y - w0.y;

      const r = 1.0 / (x1 * y2 - x2 * y1);

      const t = e1.scale(y2).subtract(e2.scale(y1)).scale(r);
      const b = e2.scale(x1).subtract(e1.scale(x2)).scale(r);

      tangent[i0] = tangent[i0].add(t);
      tangent[i1] = tangent[i1].add(t);
      tangent[i2] = tangent[i2].add(t);

      bitangent[i0] = bitangent[i0].add(b);
      bitangent[i1] = bitangent[i1].add(b);
      bitangent[i2] = bitangent[i2].add(b);
    }

    // Orthonormalize each tangent and calculate the handedness.
    for (let i = 0; i < vertexCount; i++) {
      const t = tangent[i];
      const b = bitangent[i];
      const n = normals[i];

      const tOrtho = t.subtract(n.scale(Vector3.Dot(n, t))).normalize();
      const w = Vector3.Cross(t, b).dot(n) > 0.0 ? 1.0 : -1.0;

      tangentBuffer[i * 4] = tOrtho.x;
      tangentBuffer[i * 4 + 1] = tOrtho.y;
      tangentBuffer[i * 4 + 2] = tOrtho.z;
      tangentBuffer[i * 4 + 3] = w;
    }
    this.setVerticesData(VertexBuffer.TangentKind, tangentBuffer, false);
  }

  public showNormals = () => {
    const normals = this.getVerticesData(VertexBuffer.NormalKind);
    const positions = this.getVerticesData(VertexBuffer.PositionKind);
    if (!normals || !positions) return;
    const color = Color3.Blue();
    const sc = this.getScene();
    const size = 1;

    const lines = [];

    for (let i = 0; i < normals.length; i += 3) {
      var v1 = Vector3.FromArray(positions, i);
      var v2 = v1.add(Vector3.FromArray(normals, i).scaleInPlace(size));
      lines.push([v1.add(this.position), v2.add(this.position)]);
    }
    const normalLines = MeshBuilder.CreateLineSystem(
      "normalLines",
      { lines: lines },
      sc
    );
    normalLines.color = color;
    return normalLines;
  };

  public showTangents = () => {
    const tangents = this.getVerticesData(VertexBuffer.TangentKind);
    const positions = this.getVerticesData(VertexBuffer.PositionKind);
    if (!tangents || !positions) return;
    const color = Color3.Red();
    const sc = this.getScene();
    const size = 1;

    const lines = [];
    for (let i = 0; i < tangents.length; i += 4) {
      var v1 = Vector3.FromArray(positions, i);
      var v2 = v1.add(Vector3.FromArray(tangents, i).scaleInPlace(size));
      lines.push([v1.add(this.position), v2.add(this.position)]);
    }
    const tangentLines = MeshBuilder.CreateLineSystem(
      "tangentLines",
      { lines: lines },
      sc
    );
    tangentLines.color = color;
    return tangentLines;
  };
}

export function computeTangents(
  vertexData: Nullable<FloatArray>,
  normalData: Nullable<FloatArray>,
  uvData: Nullable<FloatArray>,
  indices: Nullable<IndicesArray>
) {
  // const vertexData = this.getVerticesData(VertexBuffer.PositionKind);
  // const normalData = this.getVerticesData(VertexBuffer.NormalKind);
  // const uvData = this.getVerticesData(VertexBuffer.UVKind);
  // const indices = this.getIndices();

  if (!vertexData || !normalData || !uvData || !indices) {
    throw new Error("Mesh is missing required vertex data.");
  }

  const vertexCount = vertexData.length / 3;
  const triangleCount = indices.length / 3;

  const tangentBuffer = new Float32Array(vertexCount * 4);

  const vertices: Vector3[] = [];
  const normals: Vector3[] = [];
  const uvs: Vector2[] = [];

  for (let i = 0; i < vertexCount; i++) {
    vertices.push(
      new Vector3(
        vertexData[i * 3],
        vertexData[i * 3 + 1],
        vertexData[i * 3 + 2]
      )
    );
    normals.push(
      new Vector3(
        normalData[i * 3],
        normalData[i * 3 + 1],
        normalData[i * 3 + 2]
      )
    );
    uvs.push(new Vector2(uvData[i * 2], uvData[i * 2 + 1]));
  }

  const tangent: Vector3[] = new Array(vertexCount).fill(Vector3.Zero());
  const bitangent: Vector3[] = new Array(vertexCount).fill(Vector3.Zero());

  // Calculate tangent and bitangent for each triangle and add to all three vertices.
  for (let k = 0; k < triangleCount; k++) {
    const i0 = indices[k * 3];
    const i1 = indices[k * 3 + 1];
    const i2 = indices[k * 3 + 2];

    const p0 = vertices[i0];
    const p1 = vertices[i1];
    const p2 = vertices[i2];

    const w0 = uvs[i0];
    const w1 = uvs[i1];
    const w2 = uvs[i2];

    const e1 = p1.subtract(p0);
    const e2 = p2.subtract(p0);

    const x1 = w1.x - w0.x;
    const x2 = w2.x - w0.x;
    const y1 = w1.y - w0.y;
    const y2 = w2.y - w0.y;

    const r = 1.0 / (x1 * y2 - x2 * y1);

    const t = e1.scale(y2).subtract(e2.scale(y1)).scale(r);
    const b = e2.scale(x1).subtract(e1.scale(x2)).scale(r);

    tangent[i0] = tangent[i0].add(t);
    tangent[i1] = tangent[i1].add(t);
    tangent[i2] = tangent[i2].add(t);

    bitangent[i0] = bitangent[i0].add(b);
    bitangent[i1] = bitangent[i1].add(b);
    bitangent[i2] = bitangent[i2].add(b);
  }

  // Orthonormalize each tangent and calculate the handedness.
  for (let i = 0; i < vertexCount; i++) {
    const t = tangent[i];
    const b = bitangent[i];
    const n = normals[i];

    const tOrtho = t.subtract(n.scale(Vector3.Dot(n, t))).normalize();
    const w = Vector3.Cross(t, b).dot(n) > 0.0 ? 1.0 : -1.0;

    tangentBuffer[i * 4] = tOrtho.x;
    tangentBuffer[i * 4 + 1] = tOrtho.y;
    tangentBuffer[i * 4 + 2] = tOrtho.z;
    tangentBuffer[i * 4 + 3] = w;
  }
  return tangentBuffer;
  // this.setVerticesData(VertexBuffer.TangentKind, tangentBuffer, false);
}
