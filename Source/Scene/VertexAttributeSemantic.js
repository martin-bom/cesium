/**
 * An enum describing the built-in vertex attribute semantics.
 *
 * @enum {String}
 *
 * @private
 */
var VertexAttributeSemantic = {
  /**
   * Per-vertex position.
   *
   * @type {String}
   * @constant
   */
  POSITION: "POSITION",

  /**
   * Per-vertex normal.
   *
   * @type {String}
   * @constant
   */
  NORMAL: "NORMAL",

  /**
   * Per-vertex tangent.
   *
   * @type {String}
   * @constant
   */
  TANGENT: "TANGENT",

  /**
   * Per-vertex texture coordinates.
   *
   * @type {String}
   * @constant
   */
  TEXCOORD: "TEXCOORD",

  /**
   * Per-vertex color.
   *
   * @type {String}
   * @constant
   */
  COLOR: "COLOR",

  /**
   * Per-vertex joint IDs for skinning.
   *
   * @type {String}
   * @constant
   */
  JOINTS: "JOINTS",

  /**
   * Per-vertex joint weights for skinning.
   *
   * @type {String}
   * @constant
   */
  WEIGHTS: "WEIGHTS",

  /**
   * Per-vertex feature ID.
   *
   * @type {String}
   * @constant
   */
  FEATURE_ID: "FEATURE_ID",
};

/**
 * Gets the vertex attribute semantic matching the glTF attribute semantic.
 *
 * @returns {VertexAttributeSemantic} The vertex attribute semantic, or undefined if there is no match.
 *
 * @private
 */
VertexAttributeSemantic.fromGltfSemantic = function (gltfSemantic) {
  var semantic = gltfSemantic;

  // Strip the set index from the semantic
  var setIndexRegex = /^(\w+)_\d+$/;
  var setIndexMatch = setIndexRegex.exec(gltfSemantic);
  if (setIndexMatch !== null) {
    semantic = setIndexMatch[1];
  }

  switch (semantic) {
    case "POSITION":
      return VertexAttributeSemantic.POSITION;
    case "NORMAL":
      return VertexAttributeSemantic.NORMAL;
    case "TANGENT":
      return VertexAttributeSemantic.TANGENT;
    case "TEXCOORD":
      return VertexAttributeSemantic.TEXCOORD;
    case "COLOR":
      return VertexAttributeSemantic.COLOR;
    case "JOINTS":
      return VertexAttributeSemantic.JOINTS;
    case "WEIGHTS":
      return VertexAttributeSemantic.WEIGHTS;
    case "_FEATURE_ID":
    case "_BATCHID": // for b3dm compatibility
    case "BATCHID": // for legacy b3dm compatibility
      return VertexAttributeSemantic.FEATURE_ID;
  }

  return undefined;
};

/**
 * Gets the vertex attribute semantic matching the pnts semantic.
 *
 * @returns {VertexAttributeSemantic} The vertex attribute semantic, or undefined if there is no match.
 *
 * @private
 */
VertexAttributeSemantic.fromPntsSemantic = function (pntsSemantic) {
  switch (pntsSemantic) {
    case "POSITION":
    case "POSITION_QUANTIZED":
      return VertexAttributeSemantic.POSITION;
    case "RGBA":
    case "RGB":
    case "RGB565":
      return VertexAttributeSemantic.COLOR;
    case "NORMAL":
    case "NORMAL_OCT16P":
      return VertexAttributeSemantic.NORMAL;
    case "BATCH_ID":
      return VertexAttributeSemantic.FEATURE_ID;
  }

  return undefined;
};

export default Object.freeze(VertexAttributeSemantic);
