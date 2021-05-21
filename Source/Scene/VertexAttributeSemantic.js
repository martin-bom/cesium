import Check from "../Core/Check.js";

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
 * Returns whether the vertex attribute semantic can have a set index.
 *
 * @param {VertexAttributeSemantic} semantic The semantic.
 *
 * @returns {Boolean} Whether the semantic can have a set index.
 *
 * @private
 */
VertexAttributeSemantic.hasSetIndex = function (semantic) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("semantic", semantic);
  //>>includeEnd('debug');

  switch (semantic) {
    case VertexAttributeSemantic.POSITION:
    case VertexAttributeSemantic.NORMAL:
    case VertexAttributeSemantic.TANGENT:
      return false;
    case VertexAttributeSemantic.TEXCOORD:
    case VertexAttributeSemantic.COLOR:
    case VertexAttributeSemantic.JOINTS:
    case VertexAttributeSemantic.WEIGHTS:
    case VertexAttributeSemantic.FEATURE_ID:
      return true;
  }
};

/**
 * Gets the vertex attribute semantic matching the glTF semantic.
 *
 * @param {String} gltfSemantic The glTF semantic.
 *
 * @returns {VertexAttributeSemantic|undefined} The vertex attribute semantic, or undefined if there is no match.
 *
 * @private
 */
VertexAttributeSemantic.fromGltfSemantic = function (gltfSemantic) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("gltfSemantic", gltfSemantic);
  //>>includeEnd('debug');

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
 * @param {String} pntsSemantic The pnts semantic.
 *
 * @returns {VertexAttributeSemantic|undefined} The vertex attribute semantic, or undefined if there is no match.
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
