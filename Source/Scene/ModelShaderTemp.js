import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Matrix3 from "../Core/Matrix3.js";
import ColorBlendMode from "./ColorBlendMode.js";
import CustomShader from "./CustomShader.js";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";

function ModelShader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var model = options.model;
  var node = options.node;
  var primitive = options.primitive;
  var context = options.context;
  var shaderString = options.shaderString;
  var style = options.style;
  var uniformMap = options.uniformMap;
  var featureMetadata = options.featureMetadata;
  var content = options.content;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.model", model);
  Check.typeOf.object("options.node", primitive);
  Check.typeOf.object("options.primitive", primitive);
  Check.typeOf.object("options.context", context);
  if (defined(shaderString) && defined(style)) {
    throw new DeveloperError(
      "options.shaderString and options.style cannot both be defined"
    );
  }
  //>>includeEnd('debug');

  var colorBlendMode = model.colorBlendMode;

  var customShader;
  if (defined(shaderString)) {
    customShader = CustomShader.fromShaderString({
      shaderString: shaderString,
      primitive: primitive,
      uniformMap: uniformMap,
      featureMetadata: featureMetadata,
      content: content,
    });

    // Custom shader renders over the material
    colorBlendMode = ColorBlendMode.REPLACE;
  }

  var styleInfo;
  if (defined(style)) {
    styleInfo = CustomShader.fromStyle({
      style: style,
      primitive: primitive,
      uniformMap: uniformMap,
      featureMetadata: featureMetadata,
      content: content,
    });
    customShader = styleInfo.customShader;
  }

  var attributes = getAttributesInUse(
    primitive,
    customShader,
    colorBlendMode,
    context
  );

  var materialInfo = getMaterialInfo();

  // Need to figure out which defines to set - but these are really for the well-known attributes
  // This is based on the attributes array. Which is determined by the custom shader/style and the material
  //
  // For custom attributes these need to be added to the shader in JS land
  // Some custom attributes will need to get fed to the fragment shader
  //
  // In order to set attribute with more than 2 set indices it also has to be in JS land
  //
  // Have to deal with color blend mode and its interaction with the style
  // Same with translucency
  //
  // Style still uses the material
  //
  // Need an area that sets the struct values: input, attribute, uniform, property
  //
  // Need a solution for storing metadata, as textures (float textures...), or vertex attributes in the case of point clouds
}

function getAttributeWithSemantic(attributes, semantic, setIndex) {
  var attributesLength = attributes.length;
  for (var i = 0; i < attributesLength; ++i) {
    var attribute = attributes[i];
    if (attribute.semantic === semantic && attribute.setIndex === setIndex) {
      return attribute;
    }
  }
  return undefined;
}

function hasAttributeWithSemantic(attributes, semantic, setIndex) {
  return defined(getAttributeWithSemantic(attributes, semantic, setIndex));
}

function usesUnlitShader(primitive, customShader, colorBlendMode) {
  if (defined(customShader) && colorBlendMode === ColorBlendMode.REPLACE) {
    return false;
  }

  var attributes = primitive.attributes;
  if (!hasAttributeWithSemantic(attributes, VertexAttributeSemantic.NORMAL)) {
    return true;
  }

  return primitive.material.unlit;
}

function usesNormalMapping(primitive, customShader, colorBlendMode, context) {
  if (defined(customShader) && colorBlendMode === ColorBlendMode.REPLACE) {
    return false;
  }

  var hasNormalAttribute = hasAttributeWithSemantic(
    primitive.attributes,
    VertexAttributeSemantic.NORMAL
  );

  var hasTangentAttribute = hasAttributeWithSemantic(
    primitive.attributes,
    VertexAttributeSemantic.TANGENT
  );

  return (
    !usesUnlitShader(primitive, customShader, colorBlendMode) &&
    defined(primitive.material.normalTexture) &&
    hasNormalAttribute &&
    (hasTangentAttribute || context.standardDerivatives)
  );
}

function getMaterialTextures(primitive, customShader, colorBlendMode, context) {
  var textures = [];

  if (defined(customShader) && colorBlendMode === ColorBlendMode.REPLACE) {
    return textures;
  }

  var material = primitive.material;
  var unlit = usesUnlitShader(primitive, customShader, colorBlendMode);
  var specularGlossiness = material.specularGlossiness;
  var metallicRoughness = material.metallicRoughness;

  // Specular glossiness has precedence over metallic roughness
  var usesSpecularGlossiness = defined(specularGlossiness);
  var usesMetallicRoughness =
    defined(metallicRoughness) && !usesSpecularGlossiness;

  if (usesSpecularGlossiness) {
    if (defined(specularGlossiness.diffuseTexture)) {
      textures.push(specularGlossiness.diffuseTexture);
    }
    if (defined(specularGlossiness.specularGlossinessTexture) && !unlit) {
      textures.push(specularGlossiness.specularGlossinessTexture);
    }
  }

  if (usesMetallicRoughness) {
    if (defined(metallicRoughness.baseColorTexture)) {
      textures.push(metallicRoughness.baseColorTexture);
    }
    if (defined(metallicRoughness.metallicRoughnessTexture) && !unlit) {
      textures.push(metallicRoughness.metallicRoughnessTexture);
    }
  }

  if (defined(material.emissiveTexture) && !unlit) {
    textures.push(material.emissiveTexture);
  }

  if (defined(material.occlusionTexture) && !unlit) {
    textures.push(material.occlusionTexture);
  }

  if (usesNormalMapping(primitive, customShader, colorBlendMode, context)) {
    textures.push(material.normalTexture);
  }

  return textures;
}

function usesPosition(primitive) {
  return hasAttributeWithSemantic(
    primitive.attributes,
    VertexAttributeSemantic.POSITION
  );
}

function usesNormal(primitive, customShader, colorBlendMode) {
  var semantic = VertexAttributeSemantic.NORMAL;

  if (!hasAttributeWithSemantic(primitive.attributes, semantic)) {
    return false;
  }

  if (defined(customShader)) {
    if (hasAttributeWithSemantic(customShader.attributes, semantic)) {
      return true;
    }
    if (colorBlendMode === ColorBlendMode.REPLACE) {
      return false;
    }
  }

  if (usesUnlitShader(primitive, customShader, colorBlendMode)) {
    return false;
  }

  return true;
}

function usesTangent(primitive, customShader, colorBlendMode, context) {
  var semantic = VertexAttributeSemantic.TANGENT;

  if (!hasAttributeWithSemantic(primitive.attributes, semantic)) {
    return false;
  }

  if (defined(customShader)) {
    if (hasAttributeWithSemantic(customShader.attributes, semantic)) {
      return true;
    }
    if (colorBlendMode === ColorBlendMode.REPLACE) {
      return false;
    }
  }

  if (usesUnlitShader(primitive, customShader, colorBlendMode)) {
    return false;
  }

  if (!usesNormalMapping(primitive, customShader, colorBlendMode, context)) {
    return false;
  }

  return true;
}

function usesTexCoord(
  primitive,
  customShader,
  colorBlendMode,
  context,
  setIndex
) {
  var semantic = VertexAttributeSemantic.TEXCOORD;

  if (!hasAttributeWithSemantic(primitive.attributes, semantic, setIndex)) {
    return false;
  }

  if (defined(customShader)) {
    if (hasAttributeWithSemantic(customShader.attributes, semantic, setIndex)) {
      return true;
    }
    if (colorBlendMode === ColorBlendMode.REPLACE) {
      return false;
    }
  }

  var materialTextures = getMaterialTextures(
    primitive,
    customShader,
    colorBlendMode,
    context
  );
  var materialTexturesLength = materialTextures.length;
  for (var i = 0; i < materialTexturesLength; ++i) {
    var materialTexture = materialTextures[i];
    if (materialTexture.texCoord === setIndex) {
      return true;
    }
  }

  return false;
}

function usesColor(primitive, customShader, colorBlendMode, setIndex) {
  var semantic = VertexAttributeSemantic.COLOR;

  if (!hasAttributeWithSemantic(primitive.attributes, semantic, setIndex)) {
    return false;
  }

  if (defined(customShader)) {
    if (hasAttributeWithSemantic(customShader.attributes, semantic, setIndex)) {
      return true;
    }
    if (colorBlendMode === ColorBlendMode.REPLACE) {
      return false;
    }
  }

  return true;
}

function usesJoints(primitive, setIndex) {
  return hasAttributeWithSemantic(
    primitive.attributes,
    VertexAttributeSemantic.JOINTS,
    setIndex
  );
}

function usesWeights(primitive, setIndex) {
  return hasAttributeWithSemantic(
    primitive.attributes,
    VertexAttributeSemantic.WEIGHTS,
    setIndex
  );
}

function usesFeatureId(customShader, setIndex) {
  var semantic = VertexAttributeSemantic.FEATURE_ID;

  if (defined(customShader)) {
    if (hasAttributeWithSemantic(customShader.attributes, semantic, setIndex)) {
      return true;
    }
  }

  return false;
}

function usesCustomAttribute(attribute, customShader) {
  var semantic = attribute.semantic;
  var setIndex = attribute.setIndex;

  if (defined(customShader)) {
    if (hasAttributeWithSemantic(customShader.attributes, semantic, setIndex)) {
      return true;
    }
  }

  return false;
}

function usesAttribute(
  primitive,
  attribute,
  customShader,
  colorBlendMode,
  context
) {
  var semantic = attribute.semantic;
  var setIndex = attribute.setIndex;

  if (!defined(semantic)) {
    return usesCustomAttribute(attribute, customShader);
  }

  switch (semantic) {
    case VertexAttributeSemantic.POSITION:
      return usesPosition(primitive);
    case VertexAttributeSemantic.NORMAL:
      return usesNormal(primitive, customShader, colorBlendMode);
    case VertexAttributeSemantic.TANGENT:
      return usesTangent(primitive, customShader, colorBlendMode, context);
    case VertexAttributeSemantic.TEXCOORD:
      return usesTexCoord(
        primitive,
        customShader,
        colorBlendMode,
        context,
        setIndex
      );
    case VertexAttributeSemantic.COLOR:
      return usesColor(primitive, customShader, colorBlendMode, setIndex);
    case VertexAttributeSemantic.JOINTS:
      return usesJoints(primitive, setIndex);
    case VertexAttributeSemantic.WEIGHTS:
      return usesWeights(primitive, setIndex);
    case VertexAttributeSemantic.FEATURE_ID:
      return usesFeatureId(customShader, setIndex);
    default:
  }
}

function getAttributesInUse(primitive, customShader, colorBlendMode, context) {
  return primitive.attributes.filter(function (attribute) {
    return usesAttribute(
      primitive,
      attribute,
      customShader,
      colorBlendMode,
      context
    );
  });
}

function usesTextureTransform(texture) {
  return !Matrix3.equals(texture.transform, Matrix3.IDENTITY);
}

function getMaterialInfo(primitive, attributes) {
  var material = primitive.material;
  var unlit = usesUnlitShader(primitive, customShader, colorBlendMode);
  var specularGlossiness = material.specularGlossiness;
  var metallicRoughness = material.metallicRoughness;

  // Specular glossiness has precedence over metallic roughness
  var usesSpecularGlossiness = defined(specularGlossiness);
  var usesMetallicRoughness =
    defined(metallicRoughness) && !usesSpecularGlossiness;

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

  // Need a list of defines for the material
}
