import defined from "../Core/defined.js";
import AttributeSemantic from "./AttributeSemantic.js";

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
  POSITION: AttributeSemantic.POSITION,

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
  NORMAL: AttributeSemantic.NORMAL,

  /**
   * A vec3 storing the local tangent before any transforms are applied.
   *
   * @type {String}
   * @constant
   */
  TANGENT: AttributeSemantic.TANGENT,

  /**
   * A vec2 storing the texture coordinates.
   *
   * @type {String}
   * @constant
   */
  TEXCOORD: AttributeSemantic.TEXCOORD,

  /**
   * A vec4 storing the color.
   *
   * @type {String}
   * @constant
   */
  COLOR: AttributeSemantic.COLOR,

  /**
   * A float storing the feature ID.
   *
   * @type {String}
   * @constant
   */
  FEATURE_ID: AttributeSemantic.FEATURE_ID,
};

function getVariableName(semantic) {
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

StyleableAttributeSemantic.toVariableName = function (semantic, setIndex) {
  var shaderName = getVariableName(semantic);
  if (defined(setIndex)) {
    shaderName = shaderName + setIndex;
  }
  return shaderName;
};

StyleableAttributeSemantic.fromVariableName = function (semantic, setIndex) {
  var shaderName = getShaderNameForSemantic(semantic);
  if (defined(setIndex)) {
    shaderName = shaderName + setIndex;
  }
  return shaderName;
};

export default Object.freeze(StyleableAttributeSemantic);
