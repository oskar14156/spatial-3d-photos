package expo.modules.spatialcapture

import android.opengl.GLES11Ext
import android.opengl.GLES20
import com.google.ar.core.Coordinates2d
import com.google.ar.core.Frame
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer

/**
 * Draws the ARCore camera image as a full-screen quad.
 *
 * ARCore hands the camera feed over as an external OES texture and a set of
 * UVs that already account for display rotation and aspect fill, so the whole
 * job is one textured quad — no camera plumbing of our own.
 */
class CameraBackgroundRenderer {
  var textureId: Int = -1
    private set

  private var program = 0
  private var positionAttribute = 0
  private var texCoordAttribute = 0

  private val quadCoords: FloatBuffer = allocate(
    floatArrayOf(-1f, -1f, +1f, -1f, -1f, +1f, +1f, +1f)
  )
  private val texCoordsIn: FloatBuffer = allocate(
    floatArrayOf(0f, 1f, 1f, 1f, 0f, 0f, 1f, 0f)
  )
  private val texCoordsOut: FloatBuffer = allocate(FloatArray(8))

  private val vertexShader = """
    attribute vec4 a_Position;
    attribute vec2 a_TexCoord;
    varying vec2 v_TexCoord;
    void main() {
      gl_Position = a_Position;
      v_TexCoord = a_TexCoord;
    }
  """.trimIndent()

  private val fragmentShader = """
    #extension GL_OES_EGL_image_external : require
    precision mediump float;
    varying vec2 v_TexCoord;
    uniform samplerExternalOES u_Texture;
    void main() {
      gl_FragColor = texture2D(u_Texture, v_TexCoord);
    }
  """.trimIndent()

  fun createOnGlThread() {
    val textures = IntArray(1)
    GLES20.glGenTextures(1, textures, 0)
    textureId = textures[0]

    GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, textureId)
    GLES20.glTexParameteri(
      GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE
    )
    GLES20.glTexParameteri(
      GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE
    )
    GLES20.glTexParameteri(
      GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR
    )
    GLES20.glTexParameteri(
      GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR
    )

    program = GLES20.glCreateProgram()
    GLES20.glAttachShader(program, compile(GLES20.GL_VERTEX_SHADER, vertexShader))
    GLES20.glAttachShader(program, compile(GLES20.GL_FRAGMENT_SHADER, fragmentShader))
    GLES20.glLinkProgram(program)

    positionAttribute = GLES20.glGetAttribLocation(program, "a_Position")
    texCoordAttribute = GLES20.glGetAttribLocation(program, "a_TexCoord")
  }

  fun draw(frame: Frame) {
    // The display geometry changes on rotation; ARCore tells us when.
    if (frame.hasDisplayGeometryChanged()) {
      frame.transformCoordinates2d(
        Coordinates2d.OPENGL_NORMALIZED_DEVICE_COORDINATES,
        quadCoords,
        Coordinates2d.TEXTURE_NORMALIZED,
        texCoordsOut
      )
    }

    if (frame.timestamp == 0L) return

    quadCoords.position(0)
    texCoordsOut.position(0)

    GLES20.glDisable(GLES20.GL_DEPTH_TEST)
    GLES20.glDepthMask(false)
    GLES20.glUseProgram(program)

    GLES20.glActiveTexture(GLES20.GL_TEXTURE0)
    GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, textureId)

    GLES20.glVertexAttribPointer(
      positionAttribute, 2, GLES20.GL_FLOAT, false, 0, quadCoords
    )
    GLES20.glVertexAttribPointer(
      texCoordAttribute, 2, GLES20.GL_FLOAT, false, 0, texCoordsOut
    )
    GLES20.glEnableVertexAttribArray(positionAttribute)
    GLES20.glEnableVertexAttribArray(texCoordAttribute)

    GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4)

    GLES20.glDisableVertexAttribArray(positionAttribute)
    GLES20.glDisableVertexAttribArray(texCoordAttribute)
    GLES20.glDepthMask(true)
    GLES20.glEnable(GLES20.GL_DEPTH_TEST)
  }

  /** Seeds the output UVs so the first frame is not stretched. */
  fun resetTexCoords() {
    texCoordsOut.position(0)
    texCoordsOut.put(texCoordsIn.array())
    texCoordsOut.position(0)
    texCoordsIn.position(0)
  }

  private fun compile(type: Int, source: String): Int {
    val shader = GLES20.glCreateShader(type)
    GLES20.glShaderSource(shader, source)
    GLES20.glCompileShader(shader)
    return shader
  }

  private fun allocate(values: FloatArray): FloatBuffer {
    val buffer = ByteBuffer
      .allocateDirect(values.size * 4)
      .order(ByteOrder.nativeOrder())
      .asFloatBuffer()
    buffer.put(values)
    buffer.position(0)
    return buffer
  }
}
