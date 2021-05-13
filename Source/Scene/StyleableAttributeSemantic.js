import defined from "../Core/defined.js";

/**
 * An enum describing the built-in attribute semantics available for use in the
 * styling language and custom shaders.
 *
 * @enum {String}
 *
 * @private
 */
var StyleableAttributeSemantic = {
  /**
   * A vec3 storing the local Cartesian position before any transforms are applied.
   *
   * @type {String}
   * @constant
   */
  POSITION: "POSITION",

  /**
   * A vec3 storing the global Cartesian position after transforms are applied.
   *
   * POSITION_ABSOLUTE is derived from the POSITION attribute.
   *
   * Supported for backwards compatibility with pnts styling.
   * See https://github.com/CesiumGS/3d-tiles/tree/master/specification/Styling#point-cloud
   *
   * @type {String}
   * @constant
   */
  POSITION_ABSOLUTE: "POSITION_ABSOLUTE",

  /**
   * A vec3 storing the local normal before any transforms are applied.
   *
   * @type {String}
   * @constant
   */
  NORMAL: "NORMAL",

  /**
   * A vec3 storing the local tangent before any transforms are applied.
   *
   * @type {String}
   * @constant
   */
  TANGENT: "TANGENT",

  /**
   * A vec2 storing the texture coordinates.
   *
   * @type {String}
   * @constant
   */
  TEXCOORD: "TEXCOORD",

  /**
   * A vec4 storing the color.
   *
   * @type {String}
   * @constant
   */
  COLOR: "COLOR",

  /**
   * A float storing the feature ID.
   *
   * @type {String}
   * @constant
   */
  FEATURE_ID: "FEATURE_ID",
};

function getShaderNameForSemantic(semantic) {
  switch (semantic) {
    case StyleableAttributeSemantic.POSITION:
      return "position";
    case StyleableAttributeSemantic.POSITION_ABSOLUTE:
      return "positionAbsolute";
    case StyleableAttributeSemantic.NORMAL:
      return "normal";
    case StyleableAttributeSemantic.TANGENT:
      return "tangent";
    case StyleableAttributeSemantic.TEXCOORD:
      return "texCoord";
    case StyleableAttributeSemantic.COLOR:
      return "color";
    case StyleableAttributeSemantic.FEATURE_ID:
      return "featureId";
  }
}

StyleableAttributeSemantic.toShaderName = function (semantic, setIndex) {
  var shaderName = getShaderNameForSemantic(semantic);
  if (defined(setIndex)) {
    shaderName = shaderName + setIndex;
  }
  return shaderName;
};

StyleableAttributeSemantic.fromShaderName = function (semantic, setIndex) {
  var shaderName = getShaderNameForSemantic(semantic);
  if (defined(setIndex)) {
    shaderName = shaderName + setIndex;
  }
  return shaderName;
};

export default Object.freeze(StyleableAttributeSemantic);
