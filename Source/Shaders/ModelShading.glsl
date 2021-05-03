vec4 getColor(
    positionEC,
    #ifdef USE_NORMAL
        normalEC,
    #endif
    #ifdef USE_TANGENT
        tangentEC,
        bitangentEC,
    #endif
    #ifdef USE_TEXCOORD_0
        texCoord0,
    #endif
    #ifdef USE_TEXCOORD_1
        texCoord1,
    #endif
    #ifdef USE_VERTEX_COLOR
        vertexColor
    #endif
)
{
    #ifdef USE_UNLIT_SHADER
        vec4 color(1.0);
        #ifdef USE_BASE_COLOR_TEXTURE
            #ifdef BASE_COLOR_TEXCOORD_0
                vec2 texCoord
            color *= texture2D(u_baseColorTexture)
        #endif
    #endif
}