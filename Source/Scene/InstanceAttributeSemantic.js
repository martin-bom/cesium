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
   * Per-instance scale.
   *
   * @type {String}
   * @constant
   */
  SCALE: "SCALE",

  /**
   * Per-vertex feature ID.
   *
   * @type {String}
   * @constant
   */
  FEATURE_ID_0: "FEATURE_ID",
};

export default Object.freeze(InstanceAttributeSemantic);
