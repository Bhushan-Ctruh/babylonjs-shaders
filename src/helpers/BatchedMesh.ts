import {
  Effect,
  Engine,
  Matrix,
  Mesh,
  MeshBuilder,
  Nullable,
  RawTexture,
  Scene,
  ShaderMaterial,
  StandardMaterial,
  Texture,
  VertexBuffer,
  VertexData,
} from "@babylonjs/core";

function ceilPowerOfTwo(value: number): number {
  return Math.pow(2, Math.ceil(Math.log(value) / Math.LN2));
}

Effect.ShadersStore["batchVertexShader"] = `
            precision highp float;

            attribute vec3 position;
            attribute vec3 normal;
            attribute vec2 uv;
            attribute float id;

            uniform mat4 world;
            uniform mat4 view;
            uniform mat4 projection;
            
            uniform sampler2D uBatchTexture;
            uniform float uBatchTextureSize;

            varying vec2 vUv;
            varying vec3 vNormal;

            mat4 getBatchingMatrix( const in float i ) {
                float j = i * 4.0;
                float x = mod( j, float( uBatchTextureSize ) );
                float y = floor( j / float( uBatchTextureSize ) );
                float dx = 1.0 / float( uBatchTextureSize );
                float dy = 1.0 / float( uBatchTextureSize );
                y = dy * ( y + 0.5 );
                vec4 v1 = texture2D( uBatchTexture, vec2( dx * ( x + 0.5 ), y ) );
                vec4 v2 = texture2D( uBatchTexture, vec2( dx * ( x + 1.5 ), y ) );
                vec4 v3 = texture2D( uBatchTexture, vec2( dx * ( x + 2.5 ), y ) );
                vec4 v4 = texture2D( uBatchTexture, vec2( dx * ( x + 3.5 ), y ) );
                return mat4( v1, v2, v3, v4 );
            }
            
            void main() {
                vUv = uv;
                vNormal = normal;
                vec3 newPosition = position;
                mat4 batchingMatrix = getBatchingMatrix( id );
                vec4 modelPosition = batchingMatrix * vec4(newPosition, 1.);
                gl_Position = projection * view  * modelPosition;

            }
`;

Effect.ShadersStore["batchFragmentShader"] = `
            precision highp float;

            uniform sampler2D uBatchTexture;
            uniform float uBatchTextureSize;

            varying vec2 vUv;
            varying vec3 vNormal;


            void main() {
                gl_FragColor = vec4(normalize(vNormal), 1.0);
            }
`;

class BatchMaterial {
  constructor(name: string, {}, scene: Scene) {
    const material = new ShaderMaterial(
      name,
      scene,
      {
        vertex: "batch",
        fragment: "batch",
      },
      {
        attributes: ["position", "normal", "uv", "id"],
        uniforms: [
          "world",
          "worldView",
          "worldViewProjection",
          "view",
          "projection",
          "viewProjection",
          "uTime",
          "uBatchTexture",
          "uBatchTextureSize",
        ],
      }
    );

    material.backFaceCulling = true;
    material.disableDepthWrite = false;
    material.depthFunction = Engine.LEQUAL;

    return material;
  }
}

export class BatchedMesh extends Mesh {
  private _maxGeometryCount: number;
  private _maxVertexCount: number;
  private _maxIndexCount: number;

  private _meshes: Mesh[] = [];

  private _verticesCount: number = 0;
  private _indicesCount: number = 0;

  private _verticesCounts: number[] = [];
  private _indicesCounts: number[] = [];

  private _isInitialized: boolean = false;

  private _vertexData: VertexData = new VertexData();

  private _idBuffer: Float32Array;

  private _transformMatrices: Float32Array;

  private _batchingTexture: Nullable<RawTexture> = null;
  private _batchingTextureSize: number = 0;

  private _matrices: Matrix[] = [];

  private _vertexStarts = new Array<number>();
  private _indexStarts = new Array<number>();

  private _indexCount = 0;
  private _indexCounts = new Array<number>();

  constructor(
    name: string,
    {
      maxGeometryCount,
      maxVertexCount,
      maxIndexCount,
      meshes,
    }: {
      maxGeometryCount: number;
      maxVertexCount: number;
      maxIndexCount: number;
      meshes: Mesh[];
    },
    scene: Scene
  ) {
    super(name, scene);

    this._maxGeometryCount = meshes.length;
    this._maxVertexCount = 0;
    meshes.forEach((mesh) => {
      const verts = mesh.getVerticesData(VertexBuffer.PositionKind);
      if (verts) {
        this._maxVertexCount += verts.length / 3;
      }
    });
    this._maxIndexCount = 0;
    meshes.forEach((mesh) => {
      const indices = mesh.getIndices();
      if (indices) {
        this._maxIndexCount += indices.length;
      }
    });
    this._meshes = meshes;

    this._scene = scene;

    this._meshes = meshes;

    this._idBuffer = new Float32Array(maxVertexCount);

    this._transformMatrices = new Float32Array(this._meshes.length * 16);

    this._initializeTexture();
    this._meshes.forEach((m, i) => {
      this._applyMesh(m, i);
    });

    this._vertexData.applyToMesh(this);

    this.setVerticesData("id", this._idBuffer, false, 1);

    // console.log("vertexData", this._vertexData);

    const material = new BatchMaterial("batchMat", {}, scene) as ShaderMaterial;
    this.material = material;

    if (!this._batchingTexture)
      throw new Error("Batching texture not initialized");

    material.setTexture("uBatchTexture", this._batchingTexture);
    material.setFloat("uBatchTextureSize", this._batchingTextureSize);

    this.material = material;
  }

  private _applyMesh = (mesh: Mesh, index: number) => {
    if (!this._isInitialized) {
      this._vertexData.positions = new Float32Array(this._maxVertexCount * 3);
      this._vertexData.indices = new Uint32Array(this._maxIndexCount);
      this._vertexData.uvs = new Float32Array(this._maxVertexCount * 2);
      this._vertexData.normals = new Float32Array(this._maxVertexCount * 3);

      this._isInitialized = true;
    }

    const vertexData = mesh.getVerticesData(VertexBuffer.PositionKind);
    const indexData = mesh.getIndices();

    const dstIndex = this._vertexData.indices as Uint32Array;

    this._vertexStarts.push(this._verticesCount);
    this._verticesCounts.push(vertexData!.length / 3);

    if (indexData) {
      this._indexStarts.push(this._indexCount);
      this._indexCounts.push(indexData.length);
    }

    //positions
    const dstVertices = this._vertexData.positions as Float32Array;
    dstVertices.set(vertexData!, this._verticesCount * 3);

    for (let i = 0; i < vertexData!.length / 3; i++) {
      this._idBuffer[this._verticesCount + i] = index;
    }

    //uvs
    const dstUvs = this._vertexData.uvs as Float32Array;
    const uvs = mesh.getVerticesData(VertexBuffer.UVKind);

    if (uvs) {
      dstUvs.set(uvs, this._verticesCount * 2);
    }

    //normals
    const dstNormals = this._vertexData.normals as Float32Array;
    const normals = mesh.getVerticesData(VertexBuffer.NormalKind);

    if (normals) {
      dstNormals.set(normals, this._verticesCount * 3);
    }

    if (indexData) {
      for (let i = 0; i < indexData.length; i++) {
        dstIndex[this._indexCount + i] = indexData[i] + this._verticesCount;
      }
      this._indexCount += indexData.length;
    }

    this._verticesCount += vertexData!.length / 3;

    const worldMatrix = mesh.computeWorldMatrix(true);

    this.setMatrixAt(index, worldMatrix);

    mesh.dispose();
  };

  private _initializeTexture = (): void => {
    let size = Math.sqrt(this._meshes.length * 4);
    size = ceilPowerOfTwo(size);
    size = Math.max(size, 4);
    this._transformMatrices = new Float32Array(size * size * 4);

    const texture = RawTexture.CreateRGBATexture(
      this._transformMatrices,
      size,
      size,
      this._scene,
      false,
      false,
      Texture.NEAREST_SAMPLINGMODE,
      Engine.TEXTURETYPE_FLOAT
    );

    this._batchingTexture = texture;
    this._batchingTextureSize = size;
  };

  public debugTexture = () => {
    const plane = MeshBuilder.CreatePlane("plane", { size: 5 }, this._scene);

    const material = new StandardMaterial("mat", this._scene);

    if (!this._batchingTexture) {
      throw new Error("Batching texture not initialized");
    }
    material.diffuseTexture = this._batchingTexture;
    material.backFaceCulling = false;
    plane.material = material;
    this._batchingTexture.readPixels()?.then((data) => {
      console.log(data);
    });
  };

  public setMatrixAt(
    index: number,
    matrix: Matrix,
    forceUpdate?: boolean
  ): void {
    this._transformMatrices.set(matrix.toArray(), index * 16);
    if (!this._batchingTexture) {
      throw new Error("Batching texture not initialized");
    }

    // forceUpdate && this._batchingTexture.update(this._transformMatrices);
    this._matrices[index] = matrix;
  }

  public transformationNeedsUpdate = () => {
    if (!this._batchingTexture) {
      throw new Error("Batching texture not initialized");
    }
    this._batchingTexture.update(this._transformMatrices);
  };

  public getMatrixAt(index: number): Matrix {
    return this._matrices[index];
  }
}
