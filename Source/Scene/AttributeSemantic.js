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
   * Per-vertex feature IDs.
   *
   * @type {String}
   * @constant
   */
  FEATURE_ID: "FEATURE_ID",
};

export default Object.freeze(AttributeSemantic);
