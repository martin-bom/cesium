attribute vec3 a_position;

#ifdef USE_LIGHTING
    // TODO: position may be needed for styling
    varying vec3 v_positionEC;
#endif

#ifdef USE_NORMAL
    #ifdef NORMAL_OCT_ENCODED
        uniform float u_normalOctEncodedRange;
        attribute vec2 a_normal;

        vec3 octDecode(in vec2 octEncodedNormal)
        {
            // TODO: avoid hardcoding Draco behavior
            // Draco oct-encoding decodes to zxy order
            return czm_octDecode(octEncodedNormal, u_normalOctEncodedRange).zyx;
        }
    #else
        attribute vec3 a_normal;
    #endif
    uniform mat3 u_normalMatrix;
    varying vec3 v_normalEC;
#endif

#ifdef USE_TANGENT
    #ifdef TANGENT_OCT_ENCODED
        uniform float u_tangentOctEncodedRange;
        attribute vec3 a_tangent;
    #else
        attribute vec4 a_tangent;
    #endif
    uniform mat3 u_tangentMatrix;
    varying vec3 v_tangentEC;
    varying vec3 v_bitangentEC;
#endif

#ifdef USE_TEXCOORD_0
    attribute vec2 a_texCoord0;
    varying vec2 v_texCoord0;
#endif

#ifdef USE_TEXCOORD_1
    attribute vec2 a_texCoord1;
    varying vec2 v_texCoord1;
#endif

#ifdef USE_COLOR
    // If the vertex attribute is a vec3 the fourth channel is initialized as 1.0
    attribute vec4 a_color;
    varying vec4 v_color;
#endif

#ifdef USE_FEATURE_ID_0
    attribute float a_featureId0;
    #if defined(USE_STYLE) && !defined(USE_STYLE_IN_VERTEX_SHADER)
        varying float v_featureId0;
    #endif
#endif

#ifdef USE_FEATURE_ID_1
    attribute float a_featureId1;
    #if defined(USE_STYLE) && !defined(USE_STYLE_IN_VERTEX_SHADER)
        varying float v_feature_id_1;
    #endif
#endif

#ifdef USE_INSTANCING
    attribute vec4 a_instancedModelMatrixRow0;
    attribute vec4 a_instancedModelMatrixRow1;
    attribute vec4 a_instancedModelMatrixRow2;
    #ifdef USE_INSTANCED_FEATURE_ID_0
        attribute float a_instancedFeatureId_0;
    #endif
    #if USE_INSTANCED_FEATURE_ID_1
        attribute float a_instancedFeatureId_1;
    #endif
#endif

#ifdef USE_SKINNING
    attribute vec4 a_joints;
    attribute vec4 a_weights;
    uniform mat4 u_jointMatrix[JOINT_COUNT];
    // TODO: inverse bind matrices
    // joint matrix is the world transform * inverse bing matrix see skin.js
    // joints have separate normal matrices
#endif

#ifdef USE_MORPH_TARGETS
    uniform float u_morphWeights[MORPH_TARGET_COUNT];

    #ifdef USE_TARGET_POSITION_0
        in vec3 a_target_position_0;
    #endif

    #ifdef USE_TARGET_POSITION_1
        in vec3 a_target_position_1;
    #endif

    #ifdef USE_TARGET_POSITION_2
        in vec3 a_target_position_2;
    #endif

    #ifdef USE_TARGET_POSITION_3
        in vec3 a_target_position_3;
    #endif

    #ifdef USE_TARGET_POSITION_4
        in vec3 a_target_position_4;
    #endif

    #ifdef USE_TARGET_POSITION_5
        in vec3 a_target_position_5;
    #endif

    #ifdef USE_TARGET_POSITION_6
        in vec3 a_target_position_6;
    #endif

    #ifdef USE_TARGET_POSITION_7
        in vec3 a_target_position_7;
    #endif

    #ifdef USE_TARGET_NORMAL_0
        #ifdef NORMAL_OCT_ENCODED
            in vec2 a_target_normal_0;
        #else
            in vec3 a_target_normal_0;
        #endif
    #endif

    #ifdef USE_TARGET_NORMAL1
        #ifdef NORMAL_OCT_ENCODED
            in vec2 a_target_normal_1;
        #else
            in vec3 a_target_normal_1;
        #endif
    #endif

    #ifdef USE_TARGET_NORMAL2
        #ifdef NORMAL_OCT_ENCODED
            in vec2 a_target_normal_2;
        #else
            in vec3 a_target_normal_2;
        #endif
    #endif

    #ifdef USE_TARGET_NORMAL3
        #ifdef NORMAL_OCT_ENCODED
            in vec2 a_target_normal_3;
        #else
            in vec3 a_target_normal_3;
        #endif
    #endif

    #ifdef USE_TARGET_TANGENT0
        #ifdef TANGENT_OCT_ENCODED
            in vec3 a_target_tangent_0;
        #else
            in vec4 a_target_tangent_0;
        #endif
    #endif

    #ifdef USE_TARGET_TANGENT1
        #ifdef TANGENT_OCT_ENCODED
            in vec3 a_target_tangent_1;
        #else
            in vec4 a_target_tangent_1;
        #endif
    #endif

    #ifdef USE_TARGET_TANGENT2
        #ifdef TANGENT_OCT_ENCODED
            in vec3 a_target_tangent_2;
        #else
            in vec4 a_target_tangent_2;
        #endif
    #endif

    #ifdef USE_TARGET_TANGENT3
        #ifdef TANGENT_OCT_ENCODED
            in vec3 a_target_tangent_3;
        #else
            in vec4 a_target_tangent_3;
        #endif
    #endif

    vec3 getTargetPosition()
    {
        vec3 position = vec3(0.0);

        #ifdef USE_TARGET_POSITION_0
            position += u_morphWeights[0] * a_target_position_0;
        #endif

        #ifdef USE_TARGET_POSITION_1
            position += u_morphWeights[1] * a_target_position_1;
        #endif

        #ifdef USE_TARGET_POSITION_2
            position += u_morphWeights[2] * a_target_position_2;
        #endif

        #ifdef USE_TARGET_POSITION_3
            position += u_morphWeights[3] * a_target_position_3;
        #endif

        #ifdef USE_TARGET_POSITION_4
            position += u_morphWeights[4] * a_target_position_4;
        #endif

        #ifdef USE_TARGET_POSITION_5
            position += u_morphWeights[5] * a_target_position_5;
        #endif

        #ifdef USE_TARGET_POSITION_6
            position += u_morphWeights[6] * a_target_position_6;
        #endif

        #ifdef USE_TARGET_POSITION_7
            position += u_morphWeights[7] * a_target_position_7;
        #endif

        return position;
    }

    #ifdef USE_NORMAL
        vec3 getTargetNormal()
        {
            vec3 normal = vec3(0.0);

            #ifdef USE_TARGET_NORMAL_0
                #ifdef NORMAL_OCT_ENCODED
                    vec3 targetNormal0 = a_target_normal_0;
                #else
                    vec3 targetNormal0 = octDecode(a_target_normal_0);
                #endif
                normal += u_morphWeights[0] * targetNormal0;
            #endif

            #ifdef USE_TARGET_NORMAL_1
                #ifdef NORMAL_OCT_ENCODED
                    vec3 targetNormal1 = a_target_normal_1;
                #else
                    vec3 targetNormal1 = octDecode(a_target_normal_1);
                #endif
                normal += u_morphWeights[1] * targetNormal1;
            #endif

            #ifdef USE_TARGET_NORMAL_2
                #ifdef NORMAL_OCT_ENCODED
                    vec3 targetNormal2 = a_target_normal_2;
                #else
                    vec3 targetNormal2 = octDecode(a_target_normal_2);
                #endif
                normal += u_morphWeights[2] * targetNormal2;
            #endif

            #ifdef USE_TARGET_NORMAL_3
                #ifdef NORMAL_OCT_ENCODED
                    vec3 targetNormal3 = a_target_normal_3;
                #else
                    vec3 targetNormal3 = octDecode(a_target_normal_3);
                #endif
                normal += u_morphWeights[3] * targetNormal3;
            #endif

            return normal;
        }
    #endif

    #ifdef USE_TANGENT
        vec3 getTargetTangent()
        {
            vec3 tangent = vec3(0.0);

            #ifdef USE_TARGET_TANGENT0
                #ifdef TANGENT_OCT_ENCODED
                    vec3 targetTangent0 = a_target_tangent_0;
                #else
                    vec3 targetTangent0 = octDecode(a_target_tangent_0.xy);
                #endif
                tangent += u_morphWeights[0] * targetTangent0;
            #endif

            #ifdef USE_TARGET_TANGENT1
                #ifdef TANGENT_OCT_ENCODED
                    vec3 targetTangent1 = a_target_tangent_1;
                #else
                    vec3 targetTangent1 = octDecode(a_target_tangent_1.xy);
                #endif
                tangent += u_morphWeights[1] * targetTangent1;
            #endif

            #ifdef USE_TARGET_TANGENT2
                #ifdef TANGENT_OCT_ENCODED
                    vec3 targetTangent2 = a_target_tangent_2;
                #else
                    vec3 targetTangent2 = octDecode(a_target_tangent_2.xy);
                #endif
                tangent += u_morphWeights[2] * targetTangent2;
            #endif

            #ifdef USE_TARGET_TANGENT3
                #ifdef TANGENT_OCT_ENCODED
                    vec3 targetTangent3 = a_target_tangent_3;
                #else
                    vec3 targetTangent3 = octDecode(a_target_tangent_3.xy);
                #endif
                tangent += u_morphWeights[3] * targetTangent3;
            #endif

            return tangent;
        }
    #endif
#endif

void main()
{
    #ifdef USE_SKINNING
        mat4 skinningMatrix =
            a_weights.x * u_jointMatrix[int(a_joints.x)] +
            a_weights.y * u_jointMatrix[int(a_joints.y)] +
            a_weights.z * u_jointMatrix[int(a_joints.z)] +
            a_weights.w * u_jointMatrix[int(a_joints.w)];
    #endif

    #ifdef USE_INSTANCING
        mat4 instanceMatrix = mat4(
            a_instancedModelMatrixRow0.x,
            a_instancedModelMatrixRow1.x,
            a_instancedModelMatrixRow2.x,
            0.0,
            a_instancedModelMatrixRow0.y,
            a_instancedModelMatrixRow1.y,
            a_instancedModelMatrixRow2.y,
            0.0,
            a_instancedModelMatrixRow0.z,
            a_instancedModelMatrixRow1.z,
            a_instancedModelMatrixRow2.z,
            0.0,
            a_instancedModelMatrixRow0.w,
            a_instancedModelMatrixRow1.w,
            a_instancedModelMatrixRow2.w,
            1.0
        );
    #endif

    vec4 position = vec4(a_position, 1.0);

    #ifdef USE_MORPH_TARGETS
        position.xyz += getTargetPosition();
    #endif

    #ifdef USE_SKINNING
        // When using the KHR_mesh_quantization extension the dequantization transform is encoded in the skinning
        position = skinningMatrix * position;
    #endif

    #ifdef USE_INSTANCING
        // Instance matrix is in object space and is applied before the model matrix
        // TODO: baking the quantization matrix into the modelView won't work because quantization should happen before instance
        // When using the KHR_mesh_quantization extension the quantization decode would need to be baked into the instance TRS
        position = instanceMatrix * position;
    #endif

    #ifdef USE_LIGHTING
        v_positionEC = czm_modelView * position;
    #endif

        gl_Position = czm_modelViewProjection * position;


    #ifdef USE_NORMAL
        vec3 normal = a_normal;

    #ifdef USE_MORPH_TARGETS
        normal += getTargetNormal();
    #endif

    #ifdef USE_SKINNING
        normal = mat3(skinningMatrix) * normal;
    #endif

    #ifdef USE_INSTANCING
        normal = transpose(inverse(mat3(instanceMatrix))) * normal;
    #endif

        normal = normalize(normal);

        v_normalEC = czm_normal * normal;
    #endif // USE_NORMAL

    #ifdef USE_TANGENT
        vec3 tangent = a_tangent.xyz;

    #ifdef USE_MORPH_TARGETS
        tangent += getTargetTangent();
    #endif

    #ifdef USE_SKINNING
        tangent = mat3(skinningMatrix) * tangent;
    #endif

    #ifdef USE_INSTANCING
        tangent = mat3(instanceMatrix) * tangent;
    #endif

        tangent = normalize(tangent);

        v_tangentEC = mat3(czm_modelView) * tangent;
        v_bitangentEC = cross(v_normalEC, v_tangentEC) * a_tangent.w;
    #endif // USE_TANGENT

    #ifdef USE_INSTANCED_FEATURE_ID_0
        v_featureId = 

    #endif

    #ifdef USE_TEXCOORD_0
        v_texcoord_0 = a_texcoord_0;
    #endif

    #ifdef USE_TEXCOORD_1
        v_texcoord_1 = a_texcoord_1;
    #endif

    #ifdef USE_COLOR
        v_color = a_color;
    #endif
}