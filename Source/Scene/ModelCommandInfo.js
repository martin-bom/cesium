import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Matrix3 from "../Core/Matrix3.js";
import oneTimeWarning from "../Core/oneTimeWarning.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import RuntimeError from "../Core/RuntimeError.js";
import AlphaMode from "./AlphaMode.js";
import AttributeSemantic from "./AttributeSemantic.js";
import AttributeType from "./AttributeType.js";
import Expression from "./Expression.js";
import InputSemantic from "./InputSemantic.js";
import InstanceAttributeSemantic from "./InstanceAttributeSemantic.js";
import MetadataType from "./MetadataType.js";
import StyleableAttributeSemantic from "./StyleableAttributeSemantic.js";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";

var CARTESIAN3_ONE = Object.freeze(new Cartesian3(1.0, 1.0, 1.0));
var CARTESIAN4_ONE = Object.freeze(new Cartesian4(1.0, 1.0, 1.0, 1.0));

function PropertyInfo(options) {
  this.propertyId = options.propertyId;
  this.classProperty = options.classProperty;
  this.featureTableId = options.featureTableId; // TODO: which of these are needed?
  this.featureTextureId = options.featureTextureId;
  this.tileMetadata = options.tileMetadata;
  this.groupMetadata = options.groupMetadata;
  this.tilesetMetadata = options.tilesetMetadata;
  this.requireCpuStyling = defaultValue(options.requireCpuStyling, false);
  this.requireGpuStyling = defaultValue(options.requireGpuStyling, false);
  this.requireFragmentShaderStyling = defaultValue(
    options.requireFragmentShaderStyling,
    false
  );
  this.requireVertexShaderStyle = defaultValue(
    options.requireVertexShaderShaderStyling,
    false
  );
}

function StyleInfo(options) {
  this.inputs = options.inputs;
  this.attributes = options.attributes;
  this.uniforms = options.uniforms;
  this.properties = options.properties;
  this.attributeNameMap = options.attributeNameMap;
  this.uniformNameMap = options.uniformNameMap;
  this.propertyNameMap = options.propertyNameMap;
  this.colorShaderFunction = options.colorShaderFunction;
  this.showShaderFunction = options.showShaderFunction;
  this.pointSizeShaderFunction = options.pointSizeShaderFunction;
  this.requireCpuStyling = defaultValue(options.requireCpuStyling, false);
  this.requireGpuStyling = defaultValue(options.requireGpuStyling, false);
  this.requireFragmentShaderStyling = defaultValue(
    options.requireFragmentShaderStyling,
    false
  );
  this.requireVertexShaderShaderStyling = defaultValue(
    options.requireVertexShaderStyling,
    false
  );
}

// function getFunctionHeader(functionName) {
//   return (
//     functionName +
//     "(Input input, Attribute attribute, Uniform uniform, Property property)"
//   );
// }

function getOutputStruct() {
  return (
    "struct Output\n" +
    "{\n" +
    "    vec4 color;\n" +
    "    bool show;\n" +
    "    float pointSize;\n" +
    "};\n"
  );
}

function getCustomShaderFunction(customShader) {
  return (
    "void customShader(Input input, Attribute attribute, Uniform uniform, Property property, Output output)\n" +
    "{\n" +
    customShader +
    "\n" +
    "}\n" +
    +"\n" +
    "Output executeCustomShader(Input input, Attribute attribute, Uniform uniform, Property property)\n" +
    "{\n" +
    "    Output output = Output(vec4(1.0), true, 1.0);\n" +
    "    customShader(input, attribute, uniform, property, output);\n" +
    "    return output;\n" +
    "}\n"
  );
}

function getStructDefinition(structName, propertyDefinitions) {
  var propertyDefinitionsLength = propertyDefinitions.length;
  if (propertyDefinitionsLength === 0) {
    // Create empty placeholder struct
    return "struct " + structName + "\n{\nfloat empty;\n};";
  }

  var struct = "struct " + structName + "\n{\n";
  for (var i = 0; i < propertyDefinitionsLength; ++i) {
    struct += propertyDefinitions[i];
    if (i < propertyDefinitionsLength - 1) {
      struct += ",";
    }
    struct += "\n";
  }
  struct += "};";

  return struct;
}

// TODO: how to handle type conversions - e.g. in a custom shader or style multiplying an int property by a float property
// TODO: support enums in custom shader

function getShaderTypeFromUniformValue(uniformValue) {
  var type = typeof uniformValue;
  if (type === "number") {
    return "float";
  } else if (type === "boolean") {
    return "bool";
  } else if (uniformValue instanceof Cartesian2) {
    return "vec2";
  } else if (uniformValue instanceof Cartesian3) {
    return "vec3";
  } else if (uniformValue instanceof Cartesian4) {
    return "vec4";
  } else if (uniformValue instanceof Matrix2) {
    return "mat2";
  } else if (uniformValue instanceof Matrix3) {
    return "mat3";
  } else if (uniformValue instanceof Matrix4) {
    return "mat4";
  } else if (uniformValue instanceof Texture) {
    return "sampler2D";
  } else if (uniformValue instanceof CubeMap) {
    return "samplerCube";
  }
  // TODO: error
}

function getStructDefinitions(
  inputs,
  attributes,
  uniforms,
  properties,
  attributeNameMap,
  uniformNameMap,
  propertyNameMap
) {
  var inputDefinitions = inputs.map(function (input) {
    var type = InputSemantic.toShaderType(input.semantic);
    var name = InputSemantic.toShaderVariable(input);
    return type + " " + name;
  });
  var inputStruct = getStructDefinition("Input", inputDefinitions);

  var attributeDefinitions = attributes.map(function (attribute) {
    // TODO: should this be the quantization type or the regular type?
    var type = AttributeType.getShaderType(
      attribute.type,
      attribute.componentDatatype
    );
    var name = attributeNameMap[attribute.name];
    return type + " " + name;
  });
  var attributeStruct = getStructDefinition("Attribute", attributeDefinitions);

  var uniformDefinitions = [];
  for (var uniformName in uniforms) {
    if (uniforms.hasOwnProperty(uniformName)) {
      var uniformValue = uniforms[uniformName];
      var type = getShaderTypeFromUniformValue(uniformValue);
      var name = uniformNameMap[uniformName];
      uniformDefinitions.push(type + " " + name);
    }
  }
  var uniformStruct = getStructDefinition("Uniform", uniformDefinitions);

  var propertyDefinitions = properties.map(function (propertyInfo) {
    var type = propertyInfo.classProperty.getShaderType();
    var name = propertyNameMap[propertyInfo.propertyId];
    return type + " " + name;
  });

  var propertyStruct = getStructDefinition("Property", propertyDefinitions);

  var outputStruct = getOutputStruct();

  return (
    inputStruct +
    "\n" +
    attributeStruct +
    "\n" +
    uniformStruct +
    "\n" +
    propertyStruct +
    "\n" +
    outputStruct
  );
}

// TODO: decided not to do scoping yet

function getAttributeWithSemantic(primitive, semantic, setIndex) {
  var attributes = primitive.attributes;
  var attributesLength = attributes.length;
  for (var i = 0; i < attributesLength; ++i) {
    var attribute = attributes[i];
    if (attribute.semantic === semantic && attribute.setIndex === setIndex) {
      return attribute;
    }
  }
  return undefined;
}

function getAttributeWithName(primitive, name) {
  var attributes = primitive.attributes;
  var attributesLength = attributes.length;
  for (var i = 0; i < attributesLength; ++i) {
    var attribute = attributes[i];
    if (attribute.name === name) {
      return attribute;
    }
  }
  return undefined;
}

function getAttributesUsedInShader(primitive, shader) {
  var attributes = [];

  var regex = /input\.(\w+)/;
  var match = regex.exec(shader);

  while (match !== null) {
    var inputSemanticName = match[1];
    var inputSemanticInfo = InputSemantic.fromShaderVariable(inputSemanticName);
    if (defined(inputSemanticInfo)) {
      var semantic = inputSemanticInfo.vertexAttributeSemantic;
      var setIndex = inputSemanticInfo.setIndex;
      var attribute = getAttributeWithSemantic(primitive, semantic, setIndex);
      if (defined(attribute) && attributes.indexOf(attribute) === -1) {
        attributes.push(attribute);
      }
    }
    match = regex.exec(shader);
  }

  regex = /attribute\.(\w+)/;
  match = regex.exec(shader);

  while (match !== null) {
    var attributeName = match[1];
    var attribute = getAttributeWithName(primitive, attributeName);
    if (defined(attribute) && attributes.indexOf(attribute) === -1) {
      attributes.push(attribute);
    }
    match = regex.exec(shader);
  }

  return attributes;
}

function getPropertyInfoFromFeatureTable(featureTable, propertyName) {
  if (
    !featureTable.propertyExistsBySemantic(propertyName) &&
    !featureTable.propertyExists(propertyName)
  ) {
    return undefined;
  }

  if (defined(featureTable.class)) {
    var classProperty = getClassProperty(featureTable.class, propertyName);
    if (defined(classProperty)) {
      // Requires CPU styling if the property is a string, variable-size
      // array, or fixed-size array with more than 4 components
      return new PropertyInfo({
        requireCpuStyling: !isPropertyGpuCompatible(classProperty),
        propertyId: classProperty.id,
        classProperty: classProperty,
        featureTableId: featureTableId,
      });
    }
  }

  // Requires CPU styling if the property is a JSON property or batch
  // table hierarchy property
  return new PropertyInfo({
    variable: variable,
    requireCpuStyling: true,
    propertyId: classProperty.id,
    classProperty: classProperty,
    featureTableId: featureTableId,
  });
}

function getPropertyInfo(content, primitive, featureMetadata, propertyName) {
  var i;
  var featureTableId;
  var featureTable;
  var propertyInfo;
  var classProperty;

  // Check if the property exists in a feature table referenced by a feature ID attribute
  var featureIdAttributes = primitive.featureIdAttributes;
  var featureIdAttributesLength = featureIdAttributes.length;
  for (i = 0; i < featureIdAttributesLength; ++i) {
    var featureIdAttribute = featureIdAttributes[i];
    featureTableId = featureIdAttribute.featureTableId;
    featureTable = featureMetadata.getFeatureTable(featureTableId);
    propertyInfo = getPropertyInfoFromFeatureTable(featureTable, propertyName);
    if (defined(propertyInfo)) {
      // Requires GPU styling if the model has per-point or per-vertex features
      // since this data is transferred to the GPU and generally impractical
      // to style on the CPU efficiently. This could change in the future with
      // vector data point features.
      var hasPerVertexMetadata = featureIdAttribute.divisor === 1;
      propertyInfo.requireGpuStyling = hasPerVertexMetadata;
      propertyInfo.requireFragmentShaderStyling =
        hasPerVertexMetadata &&
        primitive.primitiveType !== PrimitiveType.POINTS;
      return propertyInfo;
    }
  }

  // Check if the property exists in a feature table referenced by a feature ID texture
  var featureIdTextures = primitive.featureIdTextures;
  var featureIdTexturesLength = featureIdTextures.length;
  for (i = 0; i < featureIdTexturesLength; ++i) {
    var featureIdTexture = featureIdTextures[i];
    featureTableId = featureIdTexture.featureTableId;
    featureTable = featureMetadata.getFeatureTable(featureTableId);
    propertyInfo = getPropertyInfoFromFeatureTable(featureTable, propertyName);
    if (defined(propertyInfo)) {
      propertyInfo.requireFragmentShaderStyling = true;
      return propertyInfo;
    }
  }

  // Check if the property exists in a feature texture
  var featureTextureIds = primitive.featureTextureIds;
  var featureTextureIdsLength = featureTextureIds.length;
  for (i = 0; i < featureTextureIdsLength; ++i) {
    var featureTextureId = featureTextureIds[i];
    var featureTexture = featureMetadata.getFeatureTexture(featureTextureId);
    classProperty = getClassProperty(featureTexture.class, variable);
    if (defined(classProperty)) {
      return new PropertyInfo({
        variable: variable,
        requireGpuStyling: true,
        requireFragmentShaderStyling: true,
        propertyId: classProperty.id,
        classProperty: classProperty,
        featureTextureId: featureTextureId,
      });
    }
  }

  if (!defined(content)) {
    // The rest of the checks are for tile, group, and tileset metadata so
    // return early if this model isn't part of a 3D Tileset
    return undefined;
  }

  // Check if the property exists in tile metadata
  var tileMetadata = content.tile.metadata;
  if (defined(tileMetadata)) {
    classProperty = getClassProperty(tileMetadata.class, variable);
    if (defined(classProperty)) {
      return new PropertyInfo({
        variable: variable,
        requireCpuStyling: !isPropertyGpuCompatible(classProperty),
        propertyId: classProperty.id,
        classProperty: classProperty,
        tileMetadata: tileMetadata,
      });
    }
  }

  // Check if the property exists in group metadata
  var groupMetadata = content.groupMetadata;
  if (defined(groupMetadata)) {
    classProperty = getClassProperty(groupMetadata.class, variable);
    if (defined(classProperty)) {
      return new PropertyInfo({
        variable: variable,
        requireCpuStyling: !isPropertyGpuCompatible(classProperty),
        propertyId: classProperty.id,
        classProperty: classProperty,
        groupMetadata: groupMetadata,
      });
    }
  }

  // Check if the property exists in tileset metadata
  var tilesetMetadata = content.tileset.metadata;
  if (defined(tilesetMetadata) && defined(tilesetMetadata.tileset)) {
    classProperty = getClassProperty(groupMetadata.class, variable);
    if (defined(classProperty)) {
      return new PropertyInfo({
        variable: variable,
        requireCpuStyling: !isPropertyGpuCompatible(classProperty),
        propertyId: classProperty.id,
        classProperty: classProperty,
        groupMetadata: tilesetMetadata,
      });
    }
  }

  // Could not find property with a matching propertyId or semantic
  return undefined;
}

function getPropertiesUsedInShader(primitive, shader) {
  var properties = [];

  var regex = /property\.(\w+)/;
  var match = regex.exec(shader);

  while (match !== null) {
    var propertyName = match[1];
    var propertyInfo = getPropertyInfo(
      content,
      primitive,
      featureMetadata,
      propertyName
    );
    if (defined(propertyInfo)) {
      properties.push(propertyInfo);
    }

    match = regex.exec(shader);
  }

  return properties;
}

function getCustomShaderInfo() {
  // TODO: make sure to replace occurrences of "featureId" with "featureId0"
  // since that's what the input struct will have
}

function isPropertyGpuCompatible(classProperty) {
  var type = classProperty.type;
  var valueType = classProperty.valueType;
  var componentCount = classProperty.componentCount;

  if (
    type === MetadataType.ARRAY &&
    (!defined(componentCount) || componentCount > 4)
  ) {
    return false;
  }

  if (valueType === MetadataType.STRING) {
    return false;
  }

  return true;
}

function getClassProperty(classDefinition, variable) {
  var classPropertiesBySemantic = classDefinition.propertiesBySemantic;
  var classProperties = classDefinition.properties;
  return defaultValue(
    classPropertiesBySemantic[variable],
    classProperties[variable]
  );
}

function getGlslName(name, uniqueId) {
  // If the attribute name is not compatible in GLSL - e.g. has non-alphanumeric
  // characters like `:`, `-`, `#`, spaces, or unicode - use a placeholder property name
  var glslCompatibleRegex = /^[a-zA-Z_]\w*$/;
  if (glslCompatibleRegex.test(name)) {
    return name;
  }
  return "czm_style_variable_" + uniqueId;
}

function parseVariableAsProperty(
  variable,
  variableId,
  primitive,
  featureMetadata,
  properties,
  variableSubstitutionMap,
  propertyNameMap
) {
  if (!defined(featureMetadata)) {
    return false;
  }

  var propertyInfo = getPropertyInfo(
    content,
    primitive,
    featureMetadata,
    variable
  );

  if (!defined(propertyInfo)) {
    return false;
  }

  var propertyExists = false;
  var propertiesLength = properties.length;
  for (var i = 0; i < propertiesLength; ++i) {
    if (properties[i].propertyId === propertyInfo.propertyId) {
      propertyExists = true;
      break;
    }
  }

  if (propertyExists) {
    // Already saw this property
    return true;
  }

  properties.push(propertyInfo);

  var propertyName = getGlslName(propertyInfo.propertyId, variableId);
  propertyNameMap[propertyName] = variable;
  variableSubstitutionMap[variable] = "property." + propertyName;

  return true;
}

function parseVariableAsUniform(
  variable,
  variableId,
  uniforms,
  uniformMap,
  variableSubstitutionMap,
  uniformNameMap
) {
  if (!defined(uniformMap[variable])) {
    return false;
  }

  if (defined(uniforms[variable])) {
    // Already saw this uniform
    return true;
  }

  uniforms[variable] = uniformMap[variable];

  var uniformName = getGlslName(variable, variableId);
  uniformNameMap[uniformName] = variable;
  variableSubstitutionMap[variable] = "uniform." + uniformName;

  return true;
}

function parseVariableAsAttribute(
  variable,
  variableId,
  primitive,
  attributes,
  variableSubstitutionMap,
  attributeNameMap
) {
  var attribute = getAttributeWithName(primitive, variable);
  if (!defined(attribute)) {
    return false;
  }

  if (attributes.indexOf(attribute) !== -1) {
    // Already saw this attribute
    return true;
  }

  attributes.push(attribute);

  var attributeName = getGlslName(attribute.name, variableId);
  attributeNameMap[attributeName] = variable;
  variableSubstitutionMap[variable] = "attribute." + attributeName;

  return true;
}

function parseVariableAsInput(
  variable,
  primitive,
  inputs,
  attributes,
  variableSubstitutionMap
) {
  var inputSemanticInfo = InputSemantic.fromStyleVariable(variable);
  if (!defined(inputSemanticInfo)) {
    inputSemanticInfo = InputSemantic.fromShaderVariable(variable);
  }
  if (!defined(inputSemanticInfo)) {
    return false;
  }

  var vertexAttributeSemantic = inputSemanticInfo.vertexAttributeSemantic;
  var setIndex = inputSemanticInfo.setIndex;
  var attribute = getAttributeWithSemantic(
    primitive,
    vertexAttributeSemantic,
    setIndex
  );

  if (!defined(attribute)) {
    return false;
  }

  var inputExists = false;
  var inputsLength = inputs.length;
  for (var i = 0; i < inputsLength; ++i) {
    if (
      inputs[i].semantic === inputSemanticInfo.semantic &&
      inputs[i].setIndex === inputSemanticInfo.setIndex
    ) {
      inputExists = true;
      break;
    }
  }

  if (inputExists) {
    // Already saw this input
    return true;
  }

  if (attributes.indexOf(attribute) === -1) {
    // TODO: need to add to the attributeNameMap?
    attributes.push(attribute);
  }

  inputs.push(inputSemanticInfo);

  variableSubstitutionMap[variable] =
    "input." + InputSemantic.toShaderVariable(inputSemanticInfo);

  return true;
}

function getStyleInfo(primitive, featureMetadata, style, uniformMap, content) {
  // Styles may be evaluated on the CPU or GPU depending on the style and the
  // types of properties involved. On the CPU styles are evaluated per-feature
  // and the color/show results are stored in a batch texture, which is later
  // applied on the GPU, either in the vertex shader or fragment shader.
  // For GPU styling the style is converted to a shader and executed in the
  // vertex shader or fragment shader directly. CPU styling is preferred.
  //
  // In some cases a style may require both CPU styling and GPU styling, in which
  // case the style can't be applied and an error is thrown.

  // Situations where CPU styling is required:
  //   * Style uses language features not supported in GLSL like strings or regex
  //   * Style uses properties that are not GPU compatible like strings, variable-size arrays, or fixed sized arrays with more than 4 components
  //   * Style uses properties in JsonMetadataTable or BatchTableHierarchy
  //   * Style uses custom evaluate functions, see {@link Cesium3DTileStyle#color}
  //   * TODO: meta property
  //   * TODO: float64, int64, etc
  var requireCpuStyling = false;

  // Situations where GPU styling is required:
  //   * Style uses per-point properties. Large point clouds are generally impractical to style on the CPU.
  //   * Style uses per-vertex properties. Per-vertex properties need to be interpolated before being styled.
  //   * Style uses feature texture properties
  //   * Style uses vertex attributes like position, color, etc
  //   * Style uses uniforms
  //   * Style references features in different feature tables
  //   * Point size style is used
  var requireGpuStyling = false;

  // Situations where the style must be applied in the fragment shader:
  //   * Primitive uses a feature ID texture
  //   * Style uses feature texture properties
  //   * Style uses per-vertex properties
  //   * Style is evaluated on the CPU and vertex texture fetch is not supported
  var requireFragmentShaderStyling = false;

  // Situations where the style must be applied in the vertex shader:
  //   * Point size style is used
  var requireVertexShaderStyling = false;

  // Sort style variables into various buckets.
  //
  // Since style variables aren't scoped there can be name collisions which are
  // resolved in this order of precedence.
  //
  //   1. Input semantics
  //     a. Semantic form (e.g. POSITION_ABSOLUTE)
  //     b. Variable form (e.g. positionAbsolute)
  //   2. Attributes (e.g. _TEMPERATURE)
  //   3. Uniforms
  //   4. Properties (for each item below, search by semantic first, then by property ID)
  //     a. Feature
  //     b. Tile
  //     c. Group
  //     d. Tileset
  var variables = style.getVariables();
  var inputs = [];
  var attributes = [];
  var uniforms = [];
  var properties = [];

  // Build a variable substitution map that maps variable names to shader names
  var variableSubstitutionMap = {};
  var attributeNameMap = {};
  var uniformNameMap = {};
  var propertyNameMap = {};

  var variablesLength = variables.length;
  for (i = 0; i < variablesLength; ++i) {
    var variable = variables[i];

    if (
      parseVariableAsInput(
        variable,
        primitive,
        inputs,
        attributes,
        variableSubstitutionMap
      ) ||
      parseVariableAsAttribute(
        variable,
        i,
        primitive,
        attributes,
        variableSubstitutionMap,
        attributeNameMap
      ) ||
      parseVariableAsUniform(
        variable,
        i,
        uniforms,
        uniformMap,
        variableSubstitutionMap,
        uniformNameMap
      ) ||
      parseVariableAsProperty(
        variable,
        i,
        primitive,
        featureMetadata,
        properties,
        variableSubstitutionMap,
        propertyNameMap
      )
    ) {
      continue;
    }

    // Didn't find a match. The variable will evaluate to null/undefined.
    // Warn the user about this happening because the style might not work correctly.
    oneTimeWarning(
      "Style references a property that does not exist: " + variable
    );
    variableSubstitutionMap[variable] = Expression.NULL_SENTINEL;
  }

  var attributesLength = attributes.length;
  if (attributesLength > 0) {
    // Any style that references vertex attributes requires GPU styling
    requireGpuStyling = true;
  }

  var featureTableIds = [];
  var propertiesLength = properties.length;
  for (var i = 0; i < propertiesLength; ++i) {
    // Check if properties require CPU or GPU styling
    var propertyInfo = properties[i];
    if (propertyInfo.requireCpuStyling) {
      requireCpuStyling = true;
    }
    if (propertyInfo.requireGpuStyling) {
      requireGpuStyling = true;
    }
    if (propertyInfo.requireFragmentShaderStyling) {
      requireFragmentShaderStyling = true;
    }
    if (propertyInfo.requireVertexShaderShaderStyling) {
      requireVertexShaderStyling = true;
    }

    // Gather the feature table IDs in use
    var featureTableId = propertyInfo.featureTableId;
    if (defined(featureTableId)) {
      if (featureTableIds.indexOf(featureTableId) === -1) {
        featureTableIds.push(featureTableId);
      }
    }
  }

  if (featureTableIds.length > 1) {
    // If different feature tables are used in the same style the style needs to be
    // applied on the GPU. It's not possible to compose the colors/shows of
    // different feature on the CPU in a way that makes sense.
    requireGpuStyling = true;
  }

  if (uniforms.length > 0) {
    // Uniforms only work on the GPU because it's not fast enough to evaluate
    // styles on the CPU if uniforms are changing every frame (e.g. like a
    // "time" uniform)
    requireGpuStyling = true;
  }

  var hasColorStyle = defined(style.color);
  var hasShowStyle = defined(style.show);
  var hasPointSizeStyle =
    defined(style.pointSize) &&
    primitive.primitiveType === PrimitiveType.POINTS;

  if (hasPointSizeStyle) {
    // Longer term point size could be evaluated on the CPU and sent in as a
    // vertex attribute, though this is impractical for large point clouds
    requireGpuStyling = true;
    requireVertexShaderStyling = true;
  }

  var hasColorShaderFunction =
    hasColorStyle && defined(style.color.getShaderFunction);
  var hasShowShaderFunction =
    hasShowStyle && defined(style.show.getShaderFunction);
  var hasPointSizeShaderFunction =
    hasPointSizeStyle && defined(style.pointSize.getShaderFunction);

  if (
    (hasColorStyle && !hasColorShaderFunction) ||
    (hasShowStyle && !hasShowShaderFunction) ||
    (hasPointSizeStyle && !hasPointSizeShaderFunction)
  ) {
    // Styles that uses custom evaluate functions must be evaluated on the CPU.
    requireCpuStyling = true;
  }

  var shaderState = {
    translucent: false,
  };

  // Check if the style can be converted to a shader or not. Usually it can't
  // if the style uses strings or regex.
  if (!requiresCpuStyling && requireGpuStyling) {
    var colorShaderFunction;
    var showShaderFunction;
    var pointSizeShaderFunction;

    if (hasColorShaderFunction) {
      try {
        colorShaderFunction = style.getColorShaderFunction(
          getFunctionHeader("getColorFromStyle"),
          variableSubstitutionMap,
          shaderState
        );
      } catch (error) {
        requireCpuStyling = true;
      }
    }
    if (hasShowShaderFunction) {
      try {
        showShaderFunction = style.getShowShaderFunction(
          getFunctionHeader("getShowFromStyle"),
          variableSubstitutionMap,
          shaderState
        );
      } catch (error) {
        requireCpuStyling = true;
      }
    }
    if (hasPointSizeShaderFunction) {
      try {
        pointSizeShaderFunction = style.getPointSizeShaderFunction(
          getFunctionHeader("getPointSizeFromStyle"),
          variableSubstitutionMap,
          shaderState
        );
      } catch (error) {
        requireCpuStyling = true;
      }
    }

    if (!requireCpuStyling) {
      // Create custom shader from the color, show, and point size shaders
      var customShader = "";
      if (defined(colorShaderFunction)) {
        customShader +=
          "output.color = getColorForStyle(input, attribute, uniform, property)";
      }
      if (defined(
    }
  }

  if (!requireGpuStyling) {
    // If GPU styling is not required prefer CPU styling. CPU styling is
    // faster if feature properties aren't changing frequently.
    requireCpuStyling = true;
  }

  if (requireCpuStyling && ContextLimits.maximumVertexTextureImageUnits === 0) {
    // The batch texture can only be read in the frag shader
    requireFragmentShaderStyling = true;
  }

  if (requireCpuStyling && requireGpuStyling) {
    // TODO: better error message
    throw new RuntimeError("Invalid style");
  }

  return new StyleInfo({
    requireCpuStyling: requireCpuStyling,
    requireGpuStyling: requireGpuStyling,
    requireFragmentShaderStyling: requireFragmentShaderStyling,
    requireVertexShaderStyling: requireVertexShaderStyling,
    inputs: inputs,
    attributes: attributes,
    uniforms: uniforms,
    properties: properties,
    attributeNameMap: attributeNameMap,
    propertyNameMap: propertyNameMap,
    colorShaderFunction: colorShaderFunction,
    showShaderFunction: showShaderFunction,
    pointSizeShaderFunction: pointSizeShaderFunction,
    translucent: shaderState.translucent,
  });
}

// TODO: What to do about default values: it should be set on the Property struct elsewhere

function CustomShaderInfo() {
  this.usesPosition = false;
  this.usesPositionAbsolute = false;
  this.usesNormal = false;
  this.usesTangent = false;
  this.usesTexCoord0 = false;
  this.usesTexCoord1 = false;
  this.usesVertexColor = false;
  this.usesFeatureId0 = false;
  this.usesFeatureId1 = false;

  this.customAttributes = [];
  // this.featureProperties = [];
}

function getCustomShaderInfo(primitive) {
  var customShaderInfo = new CustomShaderInfo();
  var customShaderSource = primitive.customShaderSource;

  // The Geometry struct contains built-in vertex attributes, e.g.:
  //
  // struct Geometry
  // {
  //   vec3 position;
  //   vec3 positionAbsolute;
  //   vec3 normal;
  //   vec3 tangent;
  //   vec2 texCoord0;
  //   vec2 texCoord1;
  //   vec4 vertexColor;
  //   uint featureId0;
  //   uint featureId1;
  // }
  var regex = /geometry.(\w+)/g;

  var matches = regex.exec(customShaderSource);
  while (matches !== null) {
    var name = matches[1];
    switch (name) {
      case "position":
        customShaderInfo.usesPosition = true;
        break;
      case "positionAbsolute":
        customShaderInfo.usesPositionAbsolute = true;
        break;
      case "normal":
        customShaderInfo.usesNormal = true;
        break;
      case "tangent":
        customShaderInfo.usesTangent = true;
        break;
      case "texCoord0":
        customShaderInfo.usesTexCoord0 = true;
        break;
      case "texCoord1":
        customShaderInfo.usesTexCoord1 = true;
        break;
      case "vertexColor":
        customShaderInfo.usesVertexColor = true;
        break;
      case "featureId0":
        customShaderInfo.usesFeatureId0 = true;
        break;
      case "featureId1":
        customShaderInfo.usesFeatureId1 = true;
        break;
    }

    matches = regex.exec(source);
  }

  // The CustomAttributes struct contains non-built-in vertex attributes
  // named by their semantic, e.g.:
  //
  // struct CustomAttributes
  // {
  //   vec3 _TEMPERATURE;
  //   float _TIME_CAPTURED;
  //   vec4 _HSLA_COLOR;
  // }
  regex = /customAttributes.(\w+)/g;

  matches = regex.exec(customShaderSource);
  while (matches !== null) {
    var name = matches[1];
    customShaderInfo.customAttributes.push(name);
    matches = regex.exec(source);
  }

  return customShaderInfo;
}

// TODO: ${COLOR} evaluates to the application-specific default color

function StyleInfo() {
  this.usesPosition = false;
  this.usesPositionAbsolute = false;
  this.usesNormal = false;
  this.usesTangent = false;
  this.usesTexCoord0 = false;
  this.usesTexCoord1 = false;
  this.usesVertexColor = false;
  this.usesFeatureId0 = false;
  this.usesFeatureId1 = false;

  this.customAttributes = [];
  this.featureProperties = [];
}

// TODO: custom shaders with utf8 property names (including with spaces)
// does the user get access to the variable substitution map?

function ModelCommandInfo(node, primitive, context) {
  var customShaderInfo;
  var customShader = primitive.customShader;

  if (defined(customShader)) {
    customShaderInfo = getCustomShaderInfo(primitive, context);
  }

  var customShaderInfo = getCustomShaderInfo(primitive);
  var materialInfo = getMaterialInfo(primitive, context);
  var geometryInfo = getGeometryInfo(
    node,
    primitive,
    materialInfo,
    customShaderInfo,
    context
  );

  this.materialInfo = materialInfo;
  this.geometryInfo = geometryInfo;
  this.useFragmentShading = primitive.primitiveType !== PrimitiveType.POINTS;
}

ModelCommandInfo.prototype.getShaderKey = function () {
  var materialKey = this.materialInfo.getShaderKey();
  var geometryKey = this.geometryInfo.getShaderKey();
  var otherKey = Number(this.useFragmentShading);

  return materialKey + "_" + geometryKey + "_" + otherKey;
};

function GeometryInfo() {
  this.usesNormal = false;
  this.usesNormalOctEncoded = false;
  this.usesNormalOctEncodedZXY = false;
  this.usesNormalQuantized = false;
  this.usesTangent = false;
  this.usesTangentOctEncoded = false;
  this.usesTangentOctEncodedZXY = false;
  this.usesTangentQuantized = false;
  this.usesTexCoord0 = false;
  this.usesTexCoord0Quantized = false;
  this.usesTexCoord1 = false;
  this.usesTexCoord1Quantized = false;
  this.usesVertexColor = false;
  this.usesVertexColorRGB = false;
  this.usesVertexColorQuantized = false;
  this.usesPositionQuantized = false;
  this.usesInstancing = false;
  this.usesInstancedTranslation = false;
  this.usesInstancedRotation = false;
  this.usesInstancedScale = false;
  this.usesInstancedFeatureId0 = false;
  this.usesInstancedFeatureId1 = false;
  this.usesSkinning = false;
  this.usesWeightsQuantized = false;
  this.usesMorphTargets = false;
  this.usesTargetPosition0 = false;
  this.usesTargetPosition1 = false;
  this.usesTargetPosition2 = false;
  this.usesTargetPosition3 = false;
  this.usesTargetPosition4 = false;
  this.usesTargetPosition5 = false;
  this.usesTargetPosition6 = false;
  this.usesTargetPosition7 = false;
  this.usesTargetNormal0 = false;
  this.usesTargetNormal1 = false;
  this.usesTargetNormal2 = false;
  this.usesTargetNormal3 = false;
  this.usesTargetTangent0 = false;
  this.usesTargetTangent1 = false;
  this.usesTargetTangent2 = false;
  this.usesTargetTangent3 = false;
  this.jointCount = 0;

  this.usedVertexAttributesLength = 0;
}

GeometryInfo.prototype.getShaderKey = function () {
  var part1 =
    this.usesNormal |
    (this.usesNormalOctEncoded << 2) |
    (this.usesNormalOctEncodedZXY << 3) |
    (this.usesNormalQuantized << 4) |
    (this.usesTangent << 5) |
    (this.usesTangentOctEncoded << 6) |
    (this.usesTangentOctEncodedZXY << 7) |
    (this.usesTangentQuantized << 8) |
    (this.usesTexCoord0 << 9) |
    (this.usesTexCoord0Quantized << 10) |
    (this.usesTexCoord1 << 11) |
    (this.usesTexCoord1Quantized << 12) |
    (this.usesVertexColor << 13) |
    (this.usesVertexColorRGB << 14) |
    (this.usesVertexColorQuantized << 15) |
    (this.usesPositionQuantized << 16) |
    (this.usesInstancing << 17) |
    (this.usesInstancedTranslation << 18) |
    (this.usesInstancedRotation << 19) |
    (this.usesInstancedScale << 20) |
    (this.usesInstancedFeatureId0 << 21) |
    (this.usesInstancedFeatureId1 << 22) |
    (this.usesSkinning << 23) |
    (this.usesWeightsQuantized << 24) |
    (this.usesMorphTargets << 25) |
    (this.usesTargetPosition0 << 26) |
    (this.usesTargetPosition1 << 27) |
    (this.usesTargetPosition2 << 28) |
    (this.usesTargetPosition3 << 29) |
    (this.usesTargetPosition4 << 30) |
    (this.usesTargetPosition5 << 31);

  var part2 =
    this.usesTargetPosition6 |
    (this.usesTargetPosition7 << 2) |
    (this.usesTargetNormal0 << 3) |
    (this.usesTargetNormal1 << 4) |
    (this.usesTargetNormal2 << 5) |
    (this.usesTargetNormal3 << 6) |
    (this.usesTargetTangent0 << 7) |
    (this.usesTargetTangent1 << 8) |
    (this.usesTargetTangent2 << 9) |
    (this.usesTargetTangent3 << 10);

  return part1 + "_" + part2 + "_" + this.jointCount;
};

function MaterialInfo() {
  this.usesDiffuseTexture = false;
  this.usesDiffuseTextureTransform = false;
  this.usesDiffuseTexCoord0 = false;
  this.usesSpecularGlossinessTexture = false;
  this.usesSpecularGlossinessTextureTransform = false;
  this.usesSpecularGlossinessTexCoord0 = false;
  this.usesDiffuseFactor = false;
  this.usesSpecularFactor = false;
  this.usesGlossinessFactor = false;
  this.usesBaseColorTexture = false;
  this.usesBaseColorTextureTransform = false;
  this.usesBaseColorTexCoord0 = false;
  this.usesMetallicRoughnessTexture = false;
  this.usesMetallicRoughnessTextureTransform = false;
  this.usesMetallicRoughnessTexCoord0 = false;
  this.usesBaseColorFactor = false;
  this.usesMetallicFactor = false;
  this.usesRoughnessFactor = false;
  this.usesEmissiveTexture = false;
  this.usesEmissiveTextureTransform = false;
  this.usesEmissiveTexCoord0 = false;
  this.usesNormalTexture = false;
  this.usesNormalTextureTransform = false;
  this.usesNormalTexCoord0 = false;
  this.usesOcclusionTexture = false;
  this.usesOcclusionTextureTransform = false;
  this.usesOcclusionTexCoord0 = false;
  this.usesEmissiveFactor = false;
  this.usesDoubleSided = false;
  this.usesAlphaCutoff = false;
  this.usesUnlitShader = false;
  this.usesSpecularGlossiness = false;
  this.usesMetallicRoughness = false;
}

MaterialInfo.prototype.getShaderKey = function () {
  var part1 =
    this.usesDiffuseTexture |
    (this.usesDiffuseTextureTransform << 2) |
    (this.usesDiffuseTexCoord0 << 3) |
    (this.usesSpecularGlossinessTexture << 4) |
    (this.usesSpecularGlossinessTextureTransform << 5) |
    (this.usesSpecularGlossinessTexCoord0 << 6) |
    (this.usesDiffuseFactor << 7) |
    (this.usesSpecularFactor << 8) |
    (this.usesGlossinessFactor << 9) |
    (this.usesBaseColorTexture << 10) |
    (this.usesBaseColorTextureTransform << 11) |
    (this.usesBaseColorTexCoord0 << 12) |
    (this.usesMetallicRoughnessTexture << 13) |
    (this.usesMetallicRoughnessTextureTransform << 14) |
    (this.usesMetallicRoughnessTexCoord0 << 15) |
    (this.usesBaseColorFactor << 16) |
    (this.usesMetallicFactor << 17) |
    (this.usesRoughnessFactor << 18) |
    (this.usesEmissiveTexture << 19) |
    (this.usesEmissiveTextureTransform << 20) |
    (this.usesEmissiveTexCoord0 << 21) |
    (this.usesNormalTexture << 22) |
    (this.usesNormalTextureTransform << 23) |
    (this.usesNormalTexCoord0 << 24) |
    (this.usesOcclusionTexture << 25) |
    (this.usesOcclusionTextureTransform << 26) |
    (this.usesOcclusionTexCoord0 << 27) |
    (this.usesEmissiveFactor << 28) |
    (this.usesDoubleSided << 29) |
    (this.usesAlphaCutoff << 30) |
    (this.usesUnlitShader << 31);

  var part2 = this.usesSpecularGlossiness | (this.usesMetallicRoughness << 2);

  return part1 + "_" + part2;
};

function materialUsesTexCoord0(materialInfo) {
  return (
    materialInfo.usesDiffuseTexture &&
    materialInfo.usesDiffuseTexCoord0 &&
    materialInfo.usesSpecularGlossinessTexture &&
    materialInfo.usesSpecularGlossinessTexCoord0 &&
    materialInfo.usesBaseColorTexture &&
    materialInfo.usesBaseColorTexCoord0 &&
    materialInfo.usesMetallicRoughnessTexture &&
    materialInfo.usesMetallicRoughnessTexCoord0 &&
    materialInfo.usesEmissiveTexture &&
    materialInfo.usesEmissiveTexCoord0 &&
    materialInfo.usesNormalTexture &&
    materialInfo.usesNormalTexCoord0 &&
    materialInfo.usesOcclusionTexture &&
    materialInfo.usesOcclusionTexCoord0
  );
}

function materialUsesTexCoord1(materialInfo) {
  return (
    materialInfo.usesDiffuseTexture &&
    !materialInfo.usesDiffuseTexCoord0 &&
    materialInfo.usesSpecularGlossinessTexture &&
    !materialInfo.usesSpecularGlossinessTexCoord0 &&
    materialInfo.usesBaseColorTexture &&
    !materialInfo.usesBaseColorTexCoord0 &&
    materialInfo.usesMetallicRoughnessTexture &&
    !materialInfo.usesMetallicRoughnessTexCoord0 &&
    materialInfo.usesEmissiveTexture &&
    !materialInfo.usesEmissiveTexCoord0 &&
    materialInfo.usesNormalTexture &&
    !materialInfo.usesNormalTexCoord0 &&
    materialInfo.usesOcclusionTexture &&
    !materialInfo.usesOcclusionTexCoord0
  );
}

function getAttribute(attributes, semantic) {
  var attributesLength = attributes.length;
  for (var i = 0; i < attributesLength; ++i) {
    var attribute = attributes[i];
    if (attribute.semantic === semantic) {
      return attribute;
    }
  }
  return undefined;
}

function usesTextureTransform(texture) {
  return !Matrix3.equals(texture.transform, Matrix3.IDENTITY);
}

function usesTexCoord0(texture) {
  return texture.texCoord === 0;
}

function usesUnlitShader(primitive) {
  var normalAttribute = getAttribute(
    primitive.attributes,
    AttributeSemantic.NORMAL
  );
  return !defined(normalAttribute) || primitive.material.unlit;
}

function usesNormalAttribute(primitive, customShaderInfo) {
  var normalAttribute = getAttribute(
    primitive.attributes,
    AttributeSemantic.NORMAL
  );

  if (!defined(normalAttribute)) {
    return false;
  }

  if (defined(customShaderInfo)) {
    return customShaderInfo.usesNormal;
  }

  return !usesUnlitShader(primitive);
}

function usesTangentAttribute(primitive, customShaderInfo) {
  var normalAttribute = getAttribute(
    primitive.attributes,
    AttributeSemantic.NORMAL
  );

  var tangentAttribute = getAttribute(
    primitive.attributes,
    AttributeSemantic.TANGENT
  );

  if (!defined(tangentAttribute)) {
    return false;
  }

  if (defined(customShaderInfo)) {
    return customShaderInfo.usesTangent;
  }

  return (
    !usesUnlitShader(primitive) &&
    defined(primitive.material.normalTexture) &&
    defined(normalAttribute)
  );
}

function usesTexCoord0Attribute(primitive, materialInfo, customShaderInfo) {
  var texCoord0Attribute = getAttribute(
    primitive.attributes,
    AttributeSemantic.TEXCOORD_0
  );

  if (!defined(texCoord0Attribute)) {
    return false;
  }

  if (defined(customShaderInfo)) {
    return customShaderInfo.usesTexCoord0;
  }

  return materialUsesTexCoord0(materialInfo);
}

function usesTexCoord1Attribute(primitive, materialInfo, customShaderInfo) {
  var texCoord1Attribute = getAttribute(
    primitive.attributes,
    AttributeSemantic.TEXCOORD_1
  );

  if (!defined(texCoord1Attribute)) {
    return false;
  }

  if (defined(customShaderInfo)) {
    return customShaderInfo.usesTexCoord1;
  }

  return materialUsesTexCoord1(materialInfo);
}

function usesVertexColorAttribute(primitive) {
  var vertexColorAttribute = getAttribute(
    primitive.attributes,
    AttributeSemantic.COLOR
  );

  if (!defined(vertexColorAttribute)) {
    return false;
  }

  if (defined(customShaderInfo)) {
    return customShaderInfo.usesVertexColor;
  }

  return true;
}

function getGeometryInfo(
  node,
  primitive,
  materialInfo,
  customShaderInfo,
  context
) {
  var usesNormal = usesNormalAttribute(primitive);
  var usesNormalQuantized = false;
  var usesNormalOctEncoded = false;
  var usesNormalOctEncodedZXY = false;

  if (usesNormal) {
    var normalAttribute = getAttribute(
      primitive.attributes,
      AttributeSemantic.NORMAL
    );
    var normalQuantization = normalAttribute.quantization;

    if (defined(normalQuantization)) {
      usesNormalOctEncoded = normalQuantization.octEncoded;
      usesNormalOctEncodedZXY = normalQuantization.octEncodedZXY;
      usesNormalQuantized = !usesNormalOctEncoded;
    }
  }

  var usesTangent = usesTangentAttribute(primitive);
  var usesTangentQuantized = false;
  var usesTangentOctEncoded = false;
  var usesTangentOctEncodedZXY = false;

  if (usesTangent) {
    var tangentAttribute = getAttribute(
      primitive.attributes,
      AttributeSemantic.TANGENT
    );
    var tangentQuantization = tangentAttribute.quantization;

    if (defined(tangentQuantization)) {
      usesTangentOctEncoded = tangentQuantization.octEncoded;
      usesTangentOctEncodedZXY = tangentQuantization.octEncodedZXY;
      usesTangentQuantized = !usesTangentOctEncoded;
    }
  }

  var usesTexCoord0 = usesTexCoord0Attribute(primitive, materialInfo);
  var usesTexCoord0Quantized = false;

  if (usesTexCoord0) {
    var texCoord0Attribute = getAttribute(
      primitive.attributes,
      AttributeSemantic.TEXCOORD_0
    );
    usesTexCoord0Quantized = defined(texCoord0Attribute.quantization);
  }

  var usesTexCoord1 = usesTexCoord1Attribute(primitive, materialInfo);
  var usesTexCoord1Quantized = false;

  if (usesTexCoord1) {
    var texCoord1Attribute = getAttribute(
      primitive.attributes,
      AttributeSemantic.TEXCOORD_1
    );
    usesTexCoord1Quantized = defined(texCoord1Attribute.quantization);
  }

  var usesVertexColor = usesVertexColorAttribute(primitive);
  var usesVertexColorRGB = false;
  var usesVertexColorQuantized = false;

  if (usesVertexColor) {
    var vertexColorAttribute = getAttribute(
      primitive.attributes,
      AttributeSemantic.COLOR
    );
    usesVertexColorRGB = vertexColorAttribute.type === AttributeType.VEC3;
    usesVertexColorQuantized = defined(vertexColorAttribute.quantization);
  }

  var usesPosition = true;
  var positionAttribute = getAttribute(
    primitive.attributes,
    AttributeSemantic.POSITION
  );
  var usesPositionQuantized = defined(positionAttribute.quantized);

  var instances = node.instances;
  var usesInstancing = defined(instances);
  var usesInstancedTranslation = false;
  var usesInstancedRotation = false;
  var usesInstancedScale = false;
  var usesInstancedFeatureId0 = false;
  var usesInstancedFeatureId1 = false;
  var usedInstanceAttributesLength = 0;

  if (usesInstancing) {
    usesInstancedTranslation = defined(
      getAttribute(instances.attributes, InstanceAttributeSemantic.TRANSLATION)
    );

    usesInstancedRotation = defined(
      getAttribute(instances.attributes, InstanceAttributeSemantic.ROTATION)
    );

    usesInstancedScale = defined(
      getAttribute(instances.attributes, InstanceAttributeSemantic.SCALE)
    );

    usesInstancedFeatureId0 = defined(
      getAttribute(instances.attributes, InstanceAttributeSemantic.FEATURE_ID_0)
    );

    usesInstancedFeatureId1 = defined(
      getAttribute(instances.attributes, InstanceAttributeSemantic.FEATURE_ID_1)
    );

    if (context.instancedArrays) {
      if (usesInstancedRotation) {
        // If the instances have rotations load the attributes as typed arrays
        // so that instance matrices are computed on the CPU. This avoids the
        // expensive quaternion -> rotation matrix conversion in the shader.
        usedInstanceAttributesLength = 3;
      } else {
        usedInstanceAttributesLength =
          usesInstancedTranslation + usesInstancedScale;
      }

      usedInstanceAttributesLength +=
        usesInstancedFeatureId0 + usesInstancedFeatureId1;
    }
  }

  var jointsAttribute = getAttribute(
    primitive.attributes,
    AttributeSemantic.JOINTS
  );
  var weightsAttribute = getAttribute(
    primitive.attributes,
    AttributeSemantic.WEIGHTS
  );
  var usesSkinning =
    defined(node.skin) && defined(jointsAttribute) && defined(weightsAttribute);
  var usesWeightsQuantized =
    usesSkinning && defined(weightsAttribute.quantized);
  var jointCount = usesSkinning ? node.skin.joints.length : 0;

  var morphTargets = primitive.morphTargets;
  var morphTargetsLength = morphTargets.length;
  var usesMorphTargets = morphTargetsLength > 0;

  for (var i = 0; i < morphTargetsLength; ++i) {
    var morphTarget = morphTargets[i];
    var attributes = morphTarget.attributes;
    var morphPositionAttribute = getAttribute(
      attributes,
      AttributeSemantic.POSITION
    );
    var morphNormalAttribute = getAttribute(
      attributes,
      AttributeSemantic.NORMAL
    );
    var morphTangentAttribute = getAttribute(
      attributes,
      AttributeSemantic.TANGENT
    );
  }

  // TODO: custom vertex attributes used in a style or custom shader

  var usedVertexAttributesLength =
    usesPosition +
    usesNormal +
    usesTangent +
    usesTexCoord0 +
    usesTexCoord1 +
    usesVertexColor +
    usedInstanceAttributesLength;

  var geometryInfo = new GeometryInfo();
  geometryInfo.usesNormal = usesNormal;
  geometryInfo.usesNormalOctEncoded = usesNormalOctEncoded;
  geometryInfo.usesNormalOctEncodedZXY = usesNormalOctEncodedZXY;
  geometryInfo.usesNormalQuantized = usesNormalQuantized;
  geometryInfo.usesTangent = usesTangent;
  geometryInfo.usesTangentOctEncoded = usesTangentOctEncoded;
  geometryInfo.usesTangentOctEncodedZXY = usesTangentOctEncodedZXY;
  geometryInfo.usesTangentQuantized = usesTangentQuantized;
  geometryInfo.usesTexCoord0 = usesTexCoord0;
  geometryInfo.usesTexCoord0Quantized = usesTexCoord0Quantized;
  geometryInfo.usesTexCoord1 = usesTexCoord1;
  geometryInfo.usesTexCoord1Quantized = usesTexCoord1Quantized;
  geometryInfo.usesVertexColor = usesVertexColor;
  geometryInfo.usesVertexColorRGB = usesVertexColorRGB;
  geometryInfo.usesVertexColorQuantized = usesVertexColorQuantized;
  geometryInfo.usesPositionQuantized = usesPositionQuantized;
  geometryInfo.usesInstancing = usesInstancing;
  geometryInfo.usesInstancedTranslation = usesInstancedTranslation;
  geometryInfo.usesInstancedRotation = usesInstancedRotation;
  geometryInfo.usesInstancedScale = usesInstancedScale;
  geometryInfo.usesInstancedFeatureId0 = usesInstancedFeatureId0;
  geometryInfo.usesInstancedFeatureId1 = usesInstancedFeatureId1;
  geometryInfo.usesSkinning = usesSkinning;
  geometryInfo.usesWeightsQuantized = usesWeightsQuantized;
  geometryInfo.usesMorphTargets = usesMorphTargets;
  geometryInfo.usesTargetPosition0 = false;
  geometryInfo.usesTargetPosition1 = false;
  geometryInfo.usesTargetPosition2 = false;
  geometryInfo.usesTargetPosition3 = false;
  geometryInfo.usesTargetPosition4 = false;
  geometryInfo.usesTargetPosition5 = false;
  geometryInfo.usesTargetPosition6 = false;
  geometryInfo.usesTargetPosition7 = false;
  geometryInfo.usesTargetNormal0 = false;
  geometryInfo.usesTargetNormal1 = false;
  geometryInfo.usesTargetNormal2 = false;
  geometryInfo.usesTargetNormal3 = false;
  geometryInfo.usesTargetTangent0 = false;
  geometryInfo.usesTargetTangent1 = false;
  geometryInfo.usesTargetTangent2 = false;
  geometryInfo.usesTargetTangent3 = false;
  geometryInfo.jointCount = jointCount;

  geometryInfo.usedVertexAttributesLength = usedVertexAttributesLength;

  return geometryInfo;
}

function getMaterialInfo(primitive, context) {
  var material = primitive.material;
  var specularGlossiness = material.specularGlossiness;
  var metallicRoughness = material.metallicRoughness;

  // Specular glossiness has precedence over metallic roughness
  var usesSpecularGlossiness = defined(specularGlossiness);
  var usesMetallicRoughness =
    defined(metallicRoughness) && !usesSpecularGlossiness;

  var unlit = usesUnlitShader(primitive);
  var usesNormal = usesNormalAttribute(primitive);
  var usesTangent = usesTangentAttribute(primitive);

  var usesDiffuseTexture =
    usesSpecularGlossiness && defined(specularGlossiness.diffuseTexture);

  var usesDiffuseTextureTransform =
    usesDiffuseTexture &&
    usesTextureTransform(specularGlossiness.diffuseTexture);

  var usesDiffuseTexCoord0 =
    usesDiffuseTexture && usesTexCoord0(specularGlossiness.diffuseTexture);

  var usesSpecularGlossinessTexture =
    !unlit &&
    usesSpecularGlossiness &&
    defined(specularGlossiness.specularGlossinessTexture);

  var usesSpecularGlossinessTextureTransform =
    usesSpecularGlossinessTexture &&
    usesTextureTransform(specularGlossiness.specularGlossinessTexture);

  var usesSpecularGlossinessTexCoord0 =
    usesSpecularGlossinessTexture &&
    usesTexCoord0(specularGlossiness.specularGlossinessTexture);

  var usesDiffuseFactor =
    usesSpecularGlossiness &&
    !Cartesian4.equals(specularGlossiness.diffuseFactor, CARTESIAN4_ONE);

  var usesSpecularFactor =
    !unlit &&
    usesSpecularGlossiness &&
    !Cartesian3.equals(specularGlossiness.specularFactor, CARTESIAN3_ONE);

  var usesGlossinessFactor =
    !unlit &&
    usesSpecularGlossiness &&
    specularGlossiness.glossinessFactor !== 1.0;

  var usesBaseColorTexture =
    usesMetallicRoughness && defined(metallicRoughness.baseColorTexture);

  var usesBaseColorTextureTransform =
    usesBaseColorTexture &&
    usesTextureTransform(metallicRoughness.baseColorTexture);

  var usesBaseColorTexCoord0 =
    usesBaseColorTexture && usesTexCoord0(metallicRoughness.baseColorTexture);

  var usesMetallicRoughnessTexture =
    !unlit &&
    usesMetallicRoughness &&
    defined(metallicRoughness.metallicRoughnessTexture);

  var usesMetallicRoughnessTextureTransform =
    usesMetallicRoughnessTexture &&
    usesTextureTransform(metallicRoughness.metallicRoughnessTexture);

  var usesMetallicRoughnessTexCoord0 =
    usesMetallicRoughnessTexture &&
    usesTexCoord0(metallicRoughness.metallicRoughnessTexture);

  var usesBaseColorFactor =
    usesMetallicRoughness &&
    !Cartesian3.equals(metallicRoughness.baseColorFactor, CARTESIAN4_ONE);

  var usesMetallicFactor =
    !unlit && usesMetallicRoughness && metallicRoughness.metallicFactor !== 1.0;

  var usesRoughnessFactor =
    !unlit &&
    usesMetallicRoughness &&
    metallicRoughness.roughnessFactor !== 1.0;

  var usesEmissiveTexture = !unlit && defined(material.emissiveTexture);

  var usesEmissiveTextureTransform =
    usesEmissiveTexture && usesTextureTransform(material.emissiveTexture);

  var usesEmissiveTexCoord0 =
    usesEmissiveTexture && usesTexCoord0(material.emissiveTexture);

  var usesNormalTexture =
    defined(material.normalTexture) &&
    usesNormal &&
    (usesTangent || context.standardDerivatives);

  var usesNormalTextureTransform =
    usesNormalTexture && usesTextureTransform(material.normalTexture);

  var usesNormalTexCoord0 =
    usesNormalTexture && usesTexCoord0(material.normalTexture);

  var usesOcclusionTexture = !unlit && defined(material.occlusionTexture);

  var usesOcclusionTextureTransform =
    usesOcclusionTexture && usesTextureTransform(material.occlusionTexture);

  var usesOcclusionTexCoord0 =
    usesOcclusionTexture && usesTexCoord0(material.occlusionTexture);

  var usesEmissiveFactor =
    !unlit && !Cartesian3.equals(material.emissiveFactor, Cartesian3.ZERO);

  var usesDoubleSided = material.doubleSided;

  var usesAlphaCutoff = material.alphaMode === AlphaMode.MASK;

  var materialInfo = new MaterialInfo();
  materialInfo.usesDiffuseTexture = usesDiffuseTexture;
  materialInfo.usesDiffuseTextureTransform = usesDiffuseTextureTransform;
  materialInfo.usesDiffuseTexCoord0 = usesDiffuseTexCoord0;
  materialInfo.usesSpecularGlossinessTexture = usesSpecularGlossinessTexture;
  materialInfo.usesSpecularGlossinessTextureTransform = usesSpecularGlossinessTextureTransform;
  materialInfo.usesSpecularGlossinessTexCoord0 = usesSpecularGlossinessTexCoord0;
  materialInfo.usesDiffuseFactor = usesDiffuseFactor;
  materialInfo.usesSpecularFactor = usesSpecularFactor;
  materialInfo.usesGlossinessFactor = usesGlossinessFactor;
  materialInfo.usesBaseColorTexture = usesBaseColorTexture;
  materialInfo.usesBaseColorTextureTransform = usesBaseColorTextureTransform;
  materialInfo.usesBaseColorTexCoord0 = usesBaseColorTexCoord0;
  materialInfo.usesMetallicRoughnessTexture = usesMetallicRoughnessTexture;
  materialInfo.usesMetallicRoughnessTextureTransform = usesMetallicRoughnessTextureTransform;
  materialInfo.usesMetallicRoughnessTexCoord0 = usesMetallicRoughnessTexCoord0;
  materialInfo.usesBaseColorFactor = usesBaseColorFactor;
  materialInfo.usesMetallicFactor = usesMetallicFactor;
  materialInfo.usesRoughnessFactor = usesRoughnessFactor;
  materialInfo.usesEmissiveTexture = usesEmissiveTexture;
  materialInfo.usesEmissiveTextureTransform = usesEmissiveTextureTransform;
  materialInfo.usesEmissiveTexCoord0 = usesEmissiveTexCoord0;
  materialInfo.usesNormalTexture = usesNormalTexture;
  materialInfo.usesNormalTextureTransform = usesNormalTextureTransform;
  materialInfo.usesNormalTexCoord0 = usesNormalTexCoord0;
  materialInfo.usesOcclusionTexture = usesOcclusionTexture;
  materialInfo.usesOcclusionTextureTransform = usesOcclusionTextureTransform;
  materialInfo.usesOcclusionTexCoord0 = usesOcclusionTexCoord0;
  materialInfo.usesEmissiveFactor = usesEmissiveFactor;
  materialInfo.usesDoubleSided = usesDoubleSided;
  materialInfo.usesAlphaCutoff = usesAlphaCutoff;
  materialInfo.usesUnlitShader = unlit;
  materialInfo.usesSpecularGlossiness = usesSpecularGlossiness;
  materialInfo.usesMetallicRoughness = usesMetallicRoughness;

  return materialInfo;
}

export default ModelCommandInfo;
