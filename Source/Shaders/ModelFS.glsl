#ifdef FRAGMENT_SHADING
    varying vec3 v_positionEC;
    #ifdef USE_NORMAL
        varying vec3 v_normalEC;
    #endif
    #ifdef USE_TANGENT
        varying vec3 v_tangentEC;
        varying vec3 v_bitangentEC;
    #endif
    #ifdef USE_TEXCOORD_0
        varying vec2 v_texCoord0;
    #endif
    #ifdef USE_TEXCOORD_1
        varying vec2 v_texCoord1;
    #endif
    #ifdef USE_VERTEX_COLOR
        varying vec4 v_vertexColor;
    #endif
#else
    varying vec4 v_finalColor;
#endif

#if defined(USE_FEATURE_ID_0) && (defined(CPU_STYLING_FRAG_SHADER) || defined(GPU_STYLING_FRAG_SHADER))
varying float v_feature_id_0;
#endif

#if defined(USE_FEATURE_ID_1) && (defined(CPU_STYLING_FRAG_SHADER) || defined(GPU_STYLING_FRAG_SHADER))
varying float v_feature_id_1;
#endif

void main()
{
    #ifdef FRAGMENT_SHADING
        #ifdef USE_NORMAL
            vec3 normal = normalize(v_normalEC);
        #endif
        #ifdef USE_TANGENT
            vec3 tangent = normalize(v_tangentEC);
            vec3 bitangent = normalize(v_bitangentEC);
        #endif

        #if defined(USE_DOUBLE_SIDED) && defined(USE_NORMAL)
            if (czm_backFacing())
            {
                normalEC *= -1.0;
                #ifdef USE_TANGENT
                    tangentEC *= 1.0;
                    bitangentEC *= 1.0;
                #endif
            }
        #endif

        vec4 color = getColor(
            positionEC,
            #ifdef USE_NORMAL
                normalEC,
            #endif
            #ifdef USE_TANGENT
                tangentEC,
                bitangentEC,
            #endif
            #ifdef USE_TEXCOORD_0
                v_texCoord0,
            #endif
            #ifdef USE_TEXCOORD_1
                v_texCoord1,
            #endif
            #ifdef USE_VERTEX_COLOR
                v_vertexColor
            #endif
        );
    #else
        vec4 color = v_finalColor;
    #endif

    #ifdef USE_ALPHA_CUTOFF
        if (color.a < u_alphaCutoff)
        {
            discard;
        }
    #endif

    #ifndef HDR
        #ifndef USE_UNLIT_SHADER
            color = vec4(czm_acesTonemapping(color.rgb), color.a);
        #endif
        color = linearTosRGB(color);
    #endif

    gl_FragColor = color;
}
