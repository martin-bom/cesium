#ifdef USE_LIGHTING
varying vec3 v_positionEC;
#endif

#ifdef USE_NORMAL
varying vec3 v_normalEC;
#endif

#ifdef USE_TANGENT
varying vec3 v_tangentEC;
varying vec3 v_bitangentEC;
#endif

#ifdef USE_TEXCOORD_0
varying vec2 v_texcoord_0;
#endif

#ifdef USE_TEXCOORD_1
varying vec2 v_texcoord_1;
#endif

#ifdef USE_COLOR
varying vec4 v_color;
#endif

#if defined(USE_FEATURE_ID_0) && (defined(CPU_STYLING_FRAG_SHADER) || defined(GPU_STYLING_FRAG_SHADER))
varying float v_feature_id_0;
#endif

#if defined(USE_FEATURE_ID_1) && (defined(CPU_STYLING_FRAG_SHADER) || defined(GPU_STYLING_FRAG_SHADER))
varying float v_feature_id_1;
#endif

void main()
{
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}