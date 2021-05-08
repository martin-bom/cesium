/**
 * An enum describing the built-in instance attribute semantics.
 *
 * @enum {String}
 *
 * @private
 */
var InstanceAttributeSemantic = {
  /**
   * Per-instance translation.
   *
   * @type {String}
   * @constant
   */
  TRANSLATION: "TRANSLATION",

  /**
   * Per-instance rotation.
   *
   * @type {String}
   * @constant
   */
  ROTATION: "ROTATION",

  /**
   * Per-instance SCALE.
   *
   * @type {String}
   * @constant
   */
  SCALE: "SCALE",

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
InstanceAttributeSemantic.fromGltfSemantic = function (gltfSemantic) {
  switch (gltfSemantic) {
    case "TRANSLATION":
      return InstanceAttributeSemantic.TRANSLATION;
    case "ROTATION":
      return InstanceAttributeSemantic.ROTATION;
    case "SCALE":
      return InstanceAttributeSemantic.SCALE;
    case "_FEATURE_ID_0":
      return InstanceAttributeSemantic.FEATURE_ID_0;
    case "_FEATURE_ID_1":
      return InstanceAttributeSemantic.FEATURE_ID_1;
    default:
      return gltfSemantic;
  }
};

export default Object.freeze(InstanceAttributeSemantic);
