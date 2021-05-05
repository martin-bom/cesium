import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import defined from "../Core/defined.js";
import Matrix3 from "../Core/Matrix3.js";
import AlphaMode from "./AlphaMode.js";
import AttributeType from "./AttributeType.js";

var CARTESIAN3_ONE = Object.freeze(new Cartesian3(1.0, 1.0, 1.0));
var CARTESIAN4_ONE = Object.freeze(new Cartesian4(1.0, 1.0, 1.0, 1.0));

function ModelCommandInfo(node, primitive, context) {
  this.materialInfo = getMaterialInfo(primitive, context);
  this.useFragmentShading = false;
}

ModelCommandInfo.prototype.getShaderKey = function () {};

function AttributeInfo() {
  this.usesNormals = false;
  this.usesNormalsOctEncoded = false;
  this.usesNormalsOctEncodedZXY = false;
  this.usesNormalsQuantized = false;

  this.usesTangents = false;
  this.usesTangentsOctEncoded = false;
  this.usesTangentsOctEncodedZXY = false;
  this.usesTangentsQuantized = false;

  this.usesTexCoord0 = false;
  this.usesTexCoord0Quantized = false;

  this.usesTexCoord1 = false;
  this.usesTexCoord1Quantized = false;

  this.usesVertexColor = false;
  this.usesVertexColorRGB = false;
  this.usesVertexColorQuantized = false;

  this.usesPositionsQuantized = false;

  this.usesInstancing = false;
  this.usesInstancingFeatureId0 = false;
  this.usesInstancingFeatureId1 = false;

  this.usesSkinning = false;
  this.usesWeightsQuantized = false;
  this.jointCount = 0;

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
}

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

function getAttributeBySemantic(attributes, semantic) {
  var attributesLength = attributes.length;
  for (var i = 0; i < attributesLength; ++i) {
    var attribute = attributes[i];
    if (attribute.semantic === semantic) {
      return attribute;
    }
  }
  return undefined;
}

function getVertexAttributeBySemantic(primitive, semantic) {
  return getAttributeBySemantic(primitive.attributes, semantic);
}

function getInstanceAttributeBySemantic(instances, semantic) {
  return getAttributeBySemantic(instances.attributes, semantic);
}

function usesTextureTransform(texture) {
  return !Matrix3.equals(texture.transform, Matrix3.IDENTITY);
}

function usesTexCoord0(texture) {
  return texture.texCoord === 0;
}

function usesUnlitShader(primitive) {
  var normalAttribute = getVertexAttributeBySemantic(primitive, "NORMAL");
  return !defined(normalAttribute) || primitive.material.unlit;
}

function usesNormalAttribute(primitive) {
  var normalAttribute = getVertexAttributeBySemantic(primitive, "NORMAL");
  return defined(normalAttribute) && !usesUnlitShader(primitive);
}

function usesTangentAttribute(primitive) {
  var tangentAttribute = getVertexAttributeBySemantic(primitive, "TANGENT");
  var usesNormalTexture = defined(primitive.material.normalTexture);
  return (
    defined(tangentAttribute) &&
    usesNormalAttribute(primitive) &&
    usesNormalTexture
  );
}

function usesTexCoord0Attribute(primitive, materialInfo) {
  var texCoord0Attribute = getVertexAttributeBySemantic(
    primitive,
    "TEXCOORD_0"
  );
  return defined(texCoord0Attribute) && materialUsesTexCoord0(materialInfo);
}

function usesTexCoord1Attribute(primitive, materialInfo) {
  var texCoord1Attribute = getVertexAttributeBySemantic(
    primitive,
    "TEXCOORD_1"
  );
  return defined(texCoord1Attribute) && materialUsesTexCoord1(materialInfo);
}

function usesVertexColorAttribute(primitive) {
  var vertexColorAttribute = getVertexAttributeBySemantic(primitive, "COLOR_0");
  return defined(vertexColorAttribute);
}

function getGeometryInfo(node, primitive, materialInfo) {
  var usesNormals = usesNormalAttribute(primitive);
  var usesNormalsQuantized = false;
  var usesNormalsOctEncoded = false;
  var usesNormalsOctEncodedZXY = false;

  if (usesNormals) {
    var normalAttribute = getVertexAttributeBySemantic(primitive, "NORMAL");
    var normalQuantization = normalAttribute.quantization;

    if (defined(normalQuantization)) {
      usesNormalsOctEncoded = normalQuantization.octEncoded;
      usesNormalsOctEncodedZXY = normalQuantization.octEncodedZXY;
      usesNormalsQuantized = !usesNormalsOctEncoded;
    }
  }

  var usesTangents = usesTangentAttribute(primitive);
  var usesTangentsQuantized = false;
  var usesTangentsOctEncoded = false;
  var usesTangentsOctEncodedZXY = false;

  if (usesTangents) {
    var tangentAttribute = getVertexAttributeBySemantic(primitive, "TANGENT");
    var tangentQuantization = tangentAttribute.quantization;

    if (defined(tangentQuantization)) {
      usesTangentsOctEncoded = tangentQuantization.octEncoded;
      usesTangentsOctEncodedZXY = tangentQuantization.octEncodedZXY;
      usesTangentsQuantized = !usesTangentsOctEncoded;
    }
  }

  var usesTexCoord0 = usesTexCoord0Attribute(primitive, materialInfo);
  var usesTexCoord0Quantized = false;

  if (usesTexCoord0) {
    var texCoord0Attribute = getVertexAttributeBySemantic(
      primitive,
      "TEXCOORD_0"
    );
    usesTexCoord0Quantized = defined(texCoord0Attribute.quantization);
  }

  var usesTexCoord1 = usesTexCoord1Attribute(primitive, materialInfo);
  var usesTexCoord1Quantized = false;

  if (usesTexCoord1) {
    var texCoord1Attribute = getVertexAttributeBySemantic(
      primitive,
      "TEXCOORD_1"
    );
    usesTexCoord1Quantized = defined(texCoord1Attribute.quantization);
  }

  var usesVertexColor = usesVertexColorAttribute(primitive);
  var usesVertexColorRGB = false;
  var usesVertexColorQuantized = false;

  if (usesVertexColor) {
    var vertexColorAttribute = getVertexAttributeBySemantic(
      primitive,
      "COLOR_0"
    );
    usesVertexColorRGB = vertexColorAttribute.type === AttributeType.VEC3;
    usesVertexColorQuantized = defined(vertexColorAttribute.quantization);
  }

  var usesPositions = true;
  var positionAttribute = getVertexAttributeBySemantic(primitive, "POSITION");
  var usesPositionsQuantized = defined(positionAttribute.quantized);

  var usesInstancing = defined(node.instances);
  var usesInstancedFeatureId0 = false;
  var usesInstancedFeatureId1 = false;
  var usesInstancedTranslation = false;
  var usesInstancedRotation = false;
  var usesInstancedScale = false;
  var usesInstancedMatrix = false;

  if (usesInstancing) {
    usesInstancingFeatureId0 = defined(
      getInstanceAttributeBySemantic(node.instances, "_FEATURE_ID_0")
    );
    usesInstancingFeatureId1 = defined(
      getInstanceAttributeBySemantic(node.instances, "_FEATURE_ID_1")
    );
  }

  var jointsAttribute = getVertexAttributeBySemantic(primitive, "JOINTS_0");
  var weightsAttribute = getVertexAttributeBySemantic(primitive, "WEIGHTS_0");
  var usesSkinning =
    defined(node.skin) && defined(jointsAttribute) && defined(weightsAttribute);
  var usesWeightsQuantized =
    usesSkinning && defined(weightsAttribute.quantized);
  var jointCount = node.skin.joints.length;

  var vertexAttributesInUse =
    usesPositions +
    usesNormals +
    usesTangents +
    usesTexCoord0 +
    usesTexCoord1 +
    usesVertexColor;

  for (usesInstancing) {
    var usesPositions

    // TODO: ignore user-defined attributes that aren't used in the shader

    // If instances have translation, rotation, and scale those attributes will
    // be combined into a mat4 and uploaded to the GPU as three vec4 (skipping
    // the bottom row). Otherwise each attribute is uploaded to the GPU separately.
    // In all cases each attribute takes up a single vertex attribute slot.
    vertexAttributesInUse += node.instances.attributes.length;
  }

  

  var morphTargets = primitive.morphTargets;

  var attributeInfo = new AttributeInfo();
  attributeInfo.usesNormals = usesNormals;
  attributeInfo.usesNormalsOctEncoded = usesNormalsOctEncoded;
  attributeInfo.usesNormalsOctEncodedZXY = usesNormalsOctEncodedZXY;
  attributeInfo.usesNormalsQuantized = usesNormalsQuantized;
  attributeInfo.usesTangents = usesTangents;
  attributeInfo.usesTangentsOctEncoded = usesTangentsOctEncoded;
  attributeInfo.usesTangentsOctEncodedZXY = usesTangentsOctEncodedZXY;
  attributeInfo.usesTangentsQuantized = usesTangentsQuantized;
  attributeInfo.usesTexCoord0 = usesTexCoord0;
  attributeInfo.usesTexCoord0Quantized = usesTexCoord0Quantized;
  attributeInfo.usesTexCoord1 = usesTexCoord1;
  attributeInfo.usesTexCoord1Quantized = usesTexCoord1Quantized;
  attributeInfo.usesVertexColor = usesVertexColor;
  attributeInfo.usesVertexColorRGB = usesVertexColorRGB;
  attributeInfo.usesVertexColorQuantized = usesVertexColorQuantized;
  attributeInfo.usesPositionsQuantized = usesPositionsQuantized;
  attributeInfo.usesInstancing = usesInstancing;
  attributeInfo.usesInstancingFeatureId0 = usesInstancingFeatureId0;
  attributeInfo.usesInstancingFeatureId1 = usesInstancingFeatureId1;
  attributeInfo.usesSkinning = usesSkinning;
  attributeInfo.usesWeightsQuantized = usesWeightsQuantized;
  attributeInfo.jointCount = node.jointCount;

  return attributeInfo;
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
  var usesNormals = usesNormalAttribute(primitive);
  var usesTangents = usesTangentAttribute(primitive);

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
    usesNormals &&
    (usesTangents || context.standardDerivatives);

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
