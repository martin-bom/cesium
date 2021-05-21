import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";

/**
 * An enum describing the input semantics available for use in the
 * styling language and custom shaders.
 *
 * @enum {String}
 *
 * @private
 */
var InputSemantic = {
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
   * <p>
   * POSITION_ABSOLUTE is derived from the POSITION attribute.
   * </p>
   *
   * <p>
   * Supported for backwards compatibility with pnts styling.
   * See https://github.com/CesiumGS/3d-tiles/tree/master/specification/Styling#point-cloud
   * </p>
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
   * An integer storing the feature ID.
   *
   * @type {String}
   * @constant
   */
  FEATURE_ID: "FEATURE_ID",
};

function variableNameToSemantic(name) {
  switch (name) {
    case "position":
      return InputSemantic.POSITION;
    case "positionAbsolute":
      return InputSemantic.POSITION_ABSOLUTE;
    case "normal":
      return InputSemantic.NORMAL;
    case "tangent":
      return InputSemantic.TANGENT;
    case "texCoord":
      return InputSemantic.TEXCOORD;
    case "color":
      return InputSemantic.COLOR;
    case "featureId":
      return InputSemantic.FEATURE_ID;
  }
  return undefined;
}

function semanticToVariableName(semantic) {
  switch (semantic) {
    case InputSemantic.POSITION:
      return "position";
    case InputSemantic.POSITION_ABSOLUTE:
      return "positionAbsolute";
    case InputSemantic.NORMAL:
      return "normal";
    case InputSemantic.TANGENT:
      return "tangent";
    case InputSemantic.TEXCOORD:
      return "texCoord";
    case InputSemantic.COLOR:
      return "color";
    case InputSemantic.FEATURE_ID:
      return "featureId";
  }
  return undefined;
}

function getVertexAttributeSemantic(semantic) {
  switch (semantic) {
    case InputSemantic.POSITION:
    case InputSemantic.POSITION_ABSOLUTE:
      return VertexAttributeSemantic.POSITION;
    case InputSemantic.NORMAL:
      return VertexAttributeSemantic.NORMAL;
    case InputSemantic.TANGENT:
      return VertexAttributeSemantic.TANGENT;
    case InputSemantic.TEXCOORD:
      return VertexAttributeSemantic.TEXCOORD;
    case InputSemantic.COLOR:
      return VertexAttributeSemantic.COLOR;
    case InputSemantic.FEATURE_ID:
      return VertexAttributeSemantic.FEATURE_ID;
  }
  return undefined;
}

/**
 * An object containing information about the input semantic.
 *
 * @typedef {Object} InputSemanticInfo
 * @property {InputSemantic} inputSemantic The input semantic.
 * @property {VertexAttributeSemantic} vertexAttributeSemantic The vertex attribute semantic that the input semantic is derived from.
 * @property {Number} [setIndex] The optional set index.
 * @private
 */

/**
 * Converts the input semantic to a shader variable.
 *
 * @param {InputSemanticInfo} inputSemanticInfo An object containing information about the input semantic.
 *
 * @returns {String} The shader variable.
 *
 * @private
 */
InputSemantic.toShaderVariable = function (inputSemanticInfo) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("inputSemanticInfo", inputSemanticInfo);
  //>>includeEnd('debug');

  var semantic = inputSemanticInfo.semantic;
  var setIndex = inputSemanticInfo.setIndex;

  var shaderVariable = semanticToVariableName(semantic);
  if (defined(setIndex)) {
    shaderVariable += setIndex;
  }
  return shaderVariable;
};

/**
 * Gets the input semantic from the shader variable. Example matches include:
 *
 * <ul>
 * <li>input.position</li>
 * <li>input.positionAbsolute</li>
 * <li>input.featureId</li>
 * <li>input.featureId0</li>
 * <li>input.featureId1</li>
 * </ul>
 *
 * @param {String} shaderVariable The shader variable.
 *
 * @returns {InputSemanticInfo|undefined} An object containing information about the input semantic, or undefined if there is no match.
 *
 * @private
 */
InputSemantic.fromShaderVariable = function (shaderVariable) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("shaderVariable", shaderVariable);
  //>>includeEnd('debug');

  var regex = /([a-zA-Z_]+)(\d*)/;
  var match = regex.exec(shaderVariable);

  if (match === null) {
    return;
  }

  var variableName = match[1];
  var semantic = variableNameToSemantic(variableName);
  if (!defined(semantic)) {
    return;
  }

  var vertexAttributeSemantic = getVertexAttributeSemantic(semantic);

  var setIndex;
  if (VertexAttributeSemantic.hasSetIndex(vertexAttributeSemantic)) {
    if (match[2] === "") {
      setIndex = 0;
    } else {
      setIndex = parseInt(setIndex);
    }
  }

  return {
    semantic: semantic,
    vertexAttributeSemantic: vertexAttributeSemantic,
    setIndex: setIndex,
  };
};

/**
 * Gets the input semantic from the style variable. Example matches include:
 *
 * <ul>
 * <li>POSITION</li
 * <li>POSITION_ABSOLUTE</li>
 * <li>FEATURE_ID</li>
 * <li>FEATURE_ID_0</li>
 * <li>FEATURE_ID_1</li>
 * </ul>
 *
 * @param {String} styleVariable The style variable.
 *
 * @returns {InputSemanticInfo} An object containing information about the input semantic, or undefined if there is no match.
 *
 * @private
 */
InputSemantic.fromStyleVariable = function (styleVariable) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("styleVariable", styleVariable);
  //>>includeEnd('debug');

  var regex = /([a-zA-Z_]+)(_(\d+))?/;
  var match = regex.exec(styleVariable);

  if (match === null) {
    return;
  }

  var semantic = match[1];
  if (!defined(InputSemantic[semantic])) {
    return;
  }

  var vertexAttributeSemantic = getVertexAttributeSemantic(semantic);

  var setIndex;
  if (VertexAttributeSemantic.hasSetIndex(vertexAttributeSemantic)) {
    if (match[2] === "") {
      setIndex = 0;
    } else {
      setIndex = parseInt(setIndex);
    }
  }

  return {
    semantic: semantic,
    vertexAttributeSemantic: vertexAttributeSemantic,
    setIndex: setIndex,
  };
};

/**
 * Converts the input semantic to a shader type.
 *
 * @param {InputSemantic} semantic The input semantic.
 *
 * @returns {String} The shader type.
 *
 * @private
 */
InputSemantic.toShaderType = function (semantic) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("semantic", semantic);
  //>>includeEnd('debug');

  switch (semantic) {
    case InputSemantic.POSITION:
    case InputSemantic.POSITION_ABSOLUTE:
    case InputSemantic.NORMAL:
    case InputSemantic.TANGENT:
      return "vec3";
    case InputSemantic.TEXCOORD:
      return "vec2";
    case InputSemantic.COLOR:
      return "vec4";
    case InputSemantic.FEATURE_ID:
      return "int";
    default:
      return undefined;
};

export default Object.freeze(InputSemantic);
