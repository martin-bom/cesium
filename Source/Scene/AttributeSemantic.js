/**
 * An enum describing the built-in vertex attribute semantics.
 *
 * @enum {String}
 *
 * @private
 */
var AttributeSemantic = {
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
   * Per-vertex texture coordinates (first set).
   *
   * @type {String}
   * @constant
   */
  TEXCOORD_0: "TEXCOORD_0",

  /**
   * Per-vertex texture coordinates (second set).
   *
   * @type {String}
   * @constant
   */
  TEXCOORD_1: "TEXCOORD_1",

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
   * Per-vertex feature IDs (first set).
   *
   * @type {String}
   * @constant
   */
  FEATURE_ID_0: "FEATURE_ID_0",

  /**
   * Per-vertex feature IDs (second set).
   *
   * @type {String}
   * @constant
   */
  FEATURE_ID_1: "FEATURE_ID_1",
};

/**
 * Gets the built-in semantic from the glTF semantic.
 *
 * @param {String} gltfSemantic The glTF semantic.
 * @returns {String} The built-in semantic, or the glTF semantic if there is no corresponding build-in semantic.
 *
 * @private
 */
AttributeSemantic.fromGltfSemantic = function (gltfSemantic) {
  switch (gltfSemantic) {
    case "POSITION":
      return AttributeSemantic.POSITION;
    case "NORMAL":
      return AttributeSemantic.NORMAL;
    case "TANGENT":
      return AttributeSemantic.TANGENT;
    case "TEXCOORD_0":
      return AttributeSemantic.TEXCOORD_0;
    case "TEXCOORD_1":
      return AttributeSemantic.TEXCOORD_1;
    case "COLOR_0":
      return AttributeSemantic.COLOR;
    case "JOINTS_0":
      return AttributeSemantic.JOINTS;
    case "WEIGHTS_0":
      return AttributeSemantic.WEIGHTS;
    case "_FEATURE_ID_0":
      return AttributeSemantic.FEATURE_ID_0;
    case "_FEATURE_ID_1":
      return AttributeSemantic.FEATURE_ID_1;
    default:
      return gltfSemantic;
  }
};

export default Object.freeze(AttributeSemantic);
