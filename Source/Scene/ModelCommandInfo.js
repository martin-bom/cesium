import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import Matrix3 from "../Core/Matrix3.js";
import oneTimeWarning from "../Core/oneTimeWarning.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import AlphaMode from "./AlphaMode.js";
import AttributeSemantic from "./AttributeSemantic.js";
import AttributeType from "./AttributeType.js";
import Expression from "./Expression.js";
import InstanceAttributeSemantic from "./InstanceAttributeSemantic.js";
import MetadataType from "./MetadataType.js";

var CARTESIAN3_ONE = Object.freeze(new Cartesian3(1.0, 1.0, 1.0));
var CARTESIAN4_ONE = Object.freeze(new Cartesian4(1.0, 1.0, 1.0, 1.0));

var StyleEvaluation = {
  EVALUATE_CPU_APPLY_GPU_VERT: 0,
  EVALUATE_CPU_APPLY_GPU_FRAG: 1,
  EVALUATE_GPU_APPLY_GPU_VERT: 2,
  EVALUATE_GPU_APPLY_GPU_FRAG: 3,
  NONE: 4,
};

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

function AttributeInfo(semantic, setIndex) {
  this.semantic = options.semantic;
  this.setIndex = options.setIndex;
}

function getAttributeInfo(primitive, variable) {
  // Get the attribute matching the variable name. This could be any semantic
  // in {@link StyleableAttributeSemantic} or a custom semantic in the glTF
  var semantic = variable;
  var setIndex;

  var setIndexRegex = /(\w+)_(\d+)$/;
  var setIndexMatch = setIndexRegex.exec(semantic);
  if (setIndexMatch !== null) {
    // Example: FEATURE_ID_0 is split into FEATURE_ID and 0
    var semantic = setIndexMatch[1];
    var setIndex = setIndexMatch[2];
    if (defined(StyleableAttributeSemantic[semantic])) {
      var attributeInfo = new AttributeInfo();
      attributeInfo.semantic = semantic;
      attributeInfo.setIndex = setIndex;
    }
  }

  var attributes = primitive.attributes;
  var attributesLength = attributes.length;
  var hasPositionAttribute = false;
  for (var i = 0; i < attributesLength; ++i) {
    var attribute = attributes[i];
    if (semantic === attribute.semantic && setIndex === attribute.setIndex) {
      return new AttributeInfo({
        semantic: semantic,
        setIndex: setIndex,
      });
    }
    if (semantic === AttributeSemantic.POSITION) {
      hasPositionAttribute = true;
    }
  }

  if (
    hasPositionAttribute &&
    semantic === StyleableAttributeSemantic.POSITION_ABSOLUTE
  ) {
    return new AttributeInfo({
      semantic: semantic,
    });
  }

  return undefined;
}

function PropertyInfo(options) {
  this.variableName = options.variableName;
  this.propertyId = options.propertyId;
  this.classProperty = options.classProperty;
  this.requireCpuStyling = defaultValue(options.requireCpuStyling, false);
  this.requireGpuStyling = defaultValue(options.requireGpuStyling, false);
  this.featureTableId = options.featureTableId;
  this.featureTextureId = options.featureTextureId;
  this.tileMetadata = options.tileMetadata;
  this.groupMetadata = options.groupMetadata;
  this.tilesetMetadata = options.tilesetMetadata;
}

function getClassProperty(classDefinition, variable) {
  var classProperties = classDefinition.properties;
  var classPropertiesBySemantic = classDefinition.propertiesBySemantic;
  return defaultValue(
    classPropertiesBySemantic[variable],
    classProperties[variable]
  );
}

function getPropertyInfo(content, primitive, featureMetadata, variable) {
  var i;
  var classProperty;

  // Check if the property exists in a feature table
  var featureIdAttributes = primitive.featureIdAttributes;
  var featureIdAttributesLength = featureIdAttributes.length;

  for (i = 0; i < featureIdAttributesLength; ++i) {
    var featureIdAttribute = featureIdAttributes[i];
    var featureTableId = featureIdAttribute.featureTableId;
    var featureTable = featureMetadata.getFeatureTable(featureTableId);
    if (defined(featureTable.class)) {
      classProperty = getClassProperty(featureTable.class, variable);
      if (defined(classProperty)) {
        // Requires CPU styling if the property is a string, variable-size
        // array, or fixed-size array with more than 4 components
        return new PropertyInfo({
          variableName: variable,
          requireCpuStyling: !isPropertyGpuCompatible(classProperty),
          propertyId: classProperty.id,
          classProperty: classProperty,
          featureTableId: featureTableId,
        });
      }
    }

    if (featureTable.hasProperty(0, variable)) {
      // TODO: need a better way to check if the property exists in the batch table hierarchy

      // Requires CPU styling if the property is a JSON property or batch
      // table hierarchy property
      return new PropertyInfo({
        variableName: variableName,
        requireCpuStyling: true,
        propertyId: classProperty.id,
        classProperty: classProperty,
        featureTableId: featureTableId,
      });
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
      // Feature textures require GPU styling
      return new PropertyInfo({
        variableName: variableName,
        requireGpuStyling: true,
        propertyId: classProperty.id,
        classProperty: classProperty,
        featureTextureId: featureTextureId,
      });
    }
  }

  // Check if the property exists in tile metadata
  var tileMetadata = content.tile.metadata;
  if (defined(tileMetadata)) {
    classProperty = getClassProperty(tileMetadata.class, variable);
    if (defined(classProperty)) {
      return new PropertyInfo({
        variableName: variableName,
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
        variableName: variableName,
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
        variableName: variableName,
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
}

function getAttributeNameForStyle(attributeSemantic) {}

function hasAttributeSemantic(primitive, variable) {
  // Get the attribute semantic matching the variable name
  // This could be any semantic in {@link AttributeSemantic} or custom semantics in the glTF
  var attributes = primitive.attributes;
  var attributesLength = attributes.length;
  var hasPositionAttribute = false;
  for (var i = 0; i < attributesLength; ++i) {
    var semantic = attributes[i].semantic;
    if (semantic === variable) {
      return true;
    }
    if (semantic === AttributeSemantic.POSITION) {
      hasPositionAttribute = true;
    }
  }

  if (hasPositionAttribute && variable === "POSITION_ABSOLUTE") {
    // POSITION_ABSOLUTE is not technically an attribute but it can be derived
    // from the POSITION attribute.
    //
    // Supported for backwards compatibility with pnts styling.
    // See https://github.com/CesiumGS/3d-tiles/tree/master/specification/Styling#point-cloud
    return true;
  }

  return false;
}

function getStyleEvaluation(model, primitive, featureMetadata, style) {
  var i;
  var propertyInfo;

  var requireCpuStyling = false; // Style must be evaluated on the CPU
  var requireGpuStyling = false; // Style must be evaluated on the GPU
  var preferGpuStyling = false; // Prefer evaluating the style on the GPU
  var usesBuiltInTime = false; // Uses tiles3d_tileset_time

  // Separate variables into attributes, properties, undefined variables, and built-in variables
  var styleVariables = style.getVariables();
  var variables = styleVariables.variables;
  var attributes = [];
  var properties = [];
  var undefinedVariables = [];
  var builtInVariables = styleVariables.builtInVariables;

  var variablesLength = variables.length;
  for (i = 0; i < variablesLength; ++i) {
    var variable = variables[i];
    if (isAttributeSemantic(primitive, variable)) {
      // This variable refers to a vertex attribute, e.g. ${POSITION}
      attributes.push(variable);
      continue;
    }

    propertyInfo = getPropertyInfo(model, primitive, featureMetadata, variable);
    if (defined(propertyInfo)) {
      // This variable refers to a property, e.g. ${Height}
      properties.push(propertyInfo);
      continue;
    }

    // This variable doesn't exist
    undefinedVariables.push(variable);
  }

  var attributesLength = attributes.length;
  if (attributesLength > 0) {
    // Any style that references vertex attributes requires GPU styling
    requireGpuStyling = true;
  }

  var propertiesLength = properties.length;
  for (i = 0; i < propertiesLength; ++i) {
    // Check if properties require CPU or GPU styling
    propertyInfo = properties[i];
    requireCpuStyling = requireCpuStyling || propertyInfo.requireCpuStyling;
    requireGpuStyling = requireGpuStyling || propertyInfo.requireGpuStyling;
  }

  // Print warning when style references a property that doesn't exist
  var undefinedVariablesLength = undefinedVariables.length;
  for (i = 0; i < undefinedVariablesLength; ++i) {
    oneTimeWarning(
      "Style references a property that does not exist: " +
        undefinedVariables[i]
    );
  }

  var hasColorStyle = defined(style.color);
  var hasShowStyle = defined(style.show);
  var hasPointSizeStyle =
    defined(style.pointSize) &&
    primitive.primitiveType === PrimitiveType.POINTS;

  if (
    (hasColorStyle && !defined(style.color.getShaderFunction)) ||
    (hasShowStyle && !defined(style.show.getShaderFunction)) ||
    (hasPointSizeStyle && !defined(style.pointSize.getShaderFunction))
  ) {
    // Styles that uses custom evaluate functions must be evaluated on the CPU.
    requireCpuStyling = true;
  }

  var builtInVariablesLength = builtInVariables.length;
  for (i = 0; i < builtInVariablesLength; ++i) {
    var builtInVariable = builtInVariables[i];
    if (builtInVariable === "tiles3d_tileset_time") {
      // Styles using tiles3d_tileset_time should be evaluated every frame on the GPU, but not required
      // TODO: swapping the u_time should be done with the property callback thing
      usesBuiltInTime = true;
      preferGpuStyling = true;
    }
  }

  // Build a variable substitution map that converts variable names referenced in the style to variable names
  var variableSubstitutionMap = {};

  for (i = 0; i < attributesLength; ++i) {
    var attribute = attributes[i];
    variableSubstitutionMap[attribute] = "attributes." + attribute;
  }

  for (i = 0; i < propertiesLength; ++i) {
    propertyInfo = properties[i];
    var variableName = propertyInfo.variableName;
    var propertyId = propertyInfo.propertyId;
    variableSubstitutionMap[variableName] = "properties." + propertyId;
  }

  for (i = 0; i < undefinedVariablesLength; ++i) {
    variableSubstitutionMap[undefinedVariables[i]] = Expression.NULL_SENTINEL;
  }

  var builtinPropertyNameMap = {
    POSITION: "czm_3dtiles_builtin_property_POSITION",
    POSITION_ABSOLUTE: "czm_3dtiles_builtin_property_POSITION_ABSOLUTE",
    COLOR: "czm_3dtiles_builtin_property_COLOR",
    NORMAL: "czm_3dtiles_builtin_property_NORMAL",
  };

  // var propertyIdMap = {};

  // What to do about default values

  // CPU
  //     strings, regex, etc
  //     incompatible properties: string, var-sized arrays, array > 4
  //     batch table hierarchy
  //     custom evaluate functions
  //     what about that meta property?

  // EVALUATE_CPU_APPLY_GPU_FRAG
  //     feature id textures
  //     no vertex-texture-fetch

  // EVALUATE_CPU_APPLY_GPU_VERT
  //     everything else

  // GPU
  //     any situation where Cesium3DTileFeature objects aren't created
  //       per-point properties
  //       per-vertex properties (stride 1 basically where vertex interpolation is needed)
  //     tileset_3dtile_time (but if needs to use the GPU just ignore this)
  //     feature textures
  //     uses vertex attributes (position, color, etc)
  //     styling point size
  //     multiple feature tables (I think)

  // EVALUATE_GPU_APPLY_GPU_FRAG
  //     per-vertex properties (stride 1 basically where vertex interpolation is needed)
  //     feature textures
  //     using interpolated vertex attributes (position, normal, etc) - non point clouds

  // EVALUATE_GPU_APPLY_GPU_VERT
  //     everything else

  // always favor CPU

  // NONE
  //     any case where the two above are the same

  this.useFragmentShading = primitive.primitiveType !== PrimitiveType.POINTS;

  //  var styleShader =
}

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
