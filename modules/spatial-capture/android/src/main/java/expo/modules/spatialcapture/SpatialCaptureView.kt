package expo.modules.spatialcapture

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageFormat
import android.graphics.Matrix as BitmapMatrix
import android.graphics.Rect
import android.graphics.YuvImage
import android.opengl.GLES20
import android.opengl.GLSurfaceView
import android.opengl.Matrix
import android.view.Surface
import android.view.WindowManager
import com.google.ar.core.Config
import com.google.ar.core.Frame
import com.google.ar.core.Session
import com.google.ar.core.TrackingState
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10
import kotlin.math.atan2
import kotlin.math.sqrt

/**
 * ARCore viewfinder — the Android counterpart of the ARKit capture view.
 *
 * The contract with JavaScript is identical to iOS: anchor a pose on the first
 * shot, then report displacement along the *screen's* axes so "move right"
 * means right as the photographer sees it, plus a roll figure that reads zero
 * when the phone is held upright.
 */
class SpatialCaptureView(context: Context, appContext: AppContext) :
  ExpoView(context, appContext), GLSurfaceView.Renderer {

  private val surface = GLSurfaceView(context)
  private val background = CameraBackgroundRenderer()

  private var session: Session? = null
  private var active = false
  private var lastTelemetry = 0L
  private var unavailableReported = false

  /** Latest pose copied on the ARCore GL thread for JS-thread anchor calls. */
  @Volatile private var latestDisplayPose: FloatArray? = null
  @Volatile private var latestTrackingState: TrackingState? = null

  /** Camera pose recorded at the first shot; displacement is measured from it. */
  @Volatile private var anchorPose: FloatArray? = null
  private var smoothed = floatArrayOf(0f, 0f, 0f)

  private val captureRequested = AtomicBoolean(false)
  private var captureCallback: ((Result<String>) -> Unit)? = null

  private val onDistanceChange by EventDispatcher()
  private val onAvailabilityChange by EventDispatcher()
  private val onMotionChange by EventDispatcher()
  private val onTrackingStateChange by EventDispatcher()

  init {
    surface.preserveEGLContextOnPause = true
    surface.setEGLContextClientVersion(2)
    surface.setEGLConfigChooser(8, 8, 8, 8, 16, 0)
    surface.setRenderer(this)
    surface.renderMode = GLSurfaceView.RENDERMODE_CONTINUOUSLY
    addView(surface)
  }

  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
    surface.layout(0, 0, r - l, b - t)
  }

  // MARK: - Lifecycle

  fun setActive(value: Boolean) {
    if (active == value) return
    active = value
    if (value) start() else stop()
  }

  private fun start() {
    unavailableReported = false
    latestDisplayPose = null
    latestTrackingState = null

    try {
      val created = Session(context)
      session = created

      val config = Config(created)
      val depthSupported = created.isDepthModeSupported(Config.DepthMode.AUTOMATIC)
      if (depthSupported) config.depthMode = Config.DepthMode.AUTOMATIC
      config.focusMode = Config.FocusMode.AUTO
      config.updateMode = Config.UpdateMode.LATEST_CAMERA_IMAGE
      created.configure(config)
      created.resume()

      // Match the cross-platform event contract. Android's depth API is the
      // equivalent fallback to LiDAR for the shared camera UI.
      onAvailabilityChange(mapOf("worldTracking" to true, "lidar" to depthSupported))
      surface.onResume()
    } catch (error: Throwable) {
      reportUnavailable(error)
    }
  }

  private fun stop() {
    surface.onPause()
    runCatching { session?.pause() }
    latestDisplayPose = null
    latestTrackingState = null
  }

  fun release() {
    stop()
    runCatching { session?.close() }
    session = null
  }

  fun setAnchor(): Boolean {
    // Session.update() is only legal on the GL/render thread. The previous
    // implementation called it from the JS queue while onDrawFrame was also
    // updating ARCore, which could crash immediately after the first shot.
    val pose = latestDisplayPose ?: return false
    if (latestTrackingState != TrackingState.TRACKING) return false

    anchorPose = pose.copyOf()
    smoothed = floatArrayOf(0f, 0f, 0f)
    return true
  }

  fun clearAnchor() {
    anchorPose = null
    smoothed = floatArrayOf(0f, 0f, 0f)
  }

  /**
   * Grabs the next camera frame as a JPEG.
   *
   * Fulfilled on the GL thread, because that is the only place an ARCore frame
   * is valid; `capturePhoto` itself is called from the module's async queue.
   */
  fun capturePhoto(completion: (Result<String>) -> Unit) {
    captureCallback = completion
    captureRequested.set(true)
  }

  // MARK: - GLSurfaceView.Renderer

  override fun onSurfaceCreated(gl: GL10?, config: EGLConfig?) {
    background.createOnGlThread()
    background.resetTexCoords()
  }

  override fun onSurfaceChanged(gl: GL10?, width: Int, height: Int) {
    GLES20.glViewport(0, 0, width, height)
    runCatching { session?.setDisplayGeometry(displayRotation(), width, height) }
  }

  override fun onDrawFrame(gl: GL10?) {
    GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT or GLES20.GL_DEPTH_BUFFER_BIT)

    val current = session ?: return
    val frame = try {
      // Keep ARCore's display-oriented pose and camera texture in sync with
      // rotation changes, including devices that resize without recreating
      // the view.
      if (surface.width > 0 && surface.height > 0) {
        current.setDisplayGeometry(displayRotation(), surface.width, surface.height)
      }
      current.setCameraTextureName(background.textureId)
      current.update()
    } catch (error: Throwable) {
      reportUnavailable(error)
      return
    }

    try {
      background.draw(frame)
    } catch (error: Throwable) {
      reportUnavailable(error)
      return
    }

    if (captureRequested.getAndSet(false)) fulfilCapture(frame)

    val displayPose = FloatArray(16).also {
      frame.camera.displayOrientedPose.toMatrix(it, 0)
    }
    latestDisplayPose = displayPose
    latestTrackingState = frame.camera.trackingState

    // ~8 Hz is plenty for a human following a distance readout, and keeps the
    // bridge quiet while the session runs at 30 fps.
    val now = System.currentTimeMillis()
    if (now - lastTelemetry < 120) return
    lastTelemetry = now

    emitMotion(frame, displayPose)
    emitDistance(frame)
  }

  // MARK: - Telemetry

  private fun emitMotion(frame: Frame, displayPose: FloatArray) {
    val camera = frame.camera
    val roll = rollDegrees(displayPose)
    val tracking = describe(camera.trackingState)

    onTrackingStateChange(mapOf("state" to tracking))

    val anchor = anchorPose
    if (anchor == null) {
      smoothed = floatArrayOf(0f, 0f, 0f)
      onMotionChange(
        mapOf(
          "hasAnchor" to false,
          "lateral" to 0.0,
          "vertical" to 0.0,
          "forward" to 0.0,
          "rollDegrees" to roll,
          "tracking" to tracking
        )
      )
      return
    }

    // Position in the anchor camera's own frame, so "lateral" is sideways
    // relative to how the first shot was aimed.
    val inverse = FloatArray(16)
    Matrix.invertM(inverse, 0, anchor, 0)

    val world = floatArrayOf(displayPose[12], displayPose[13], displayPose[14], 1f)
    val local = FloatArray(4)
    Matrix.multiplyMV(local, 0, inverse, 0, world, 0)

    val raw = floatArrayOf(
      local[0],
      local[1],
      -local[2]
    )

    // Light exponential smoothing: world tracking jitters by a few millimetres
    // frame to frame, which made the readout twitch at centimetre precision.
    for (i in 0..2) smoothed[i] = smoothed[i] * 0.6f + raw[i] * 0.4f

    onMotionChange(
      mapOf(
        "hasAnchor" to true,
        "lateral" to smoothed[0].toDouble(),
        "vertical" to smoothed[1].toDouble(),
        "forward" to smoothed[2].toDouble(),
        "rollDegrees" to roll,
        "tracking" to tracking
      )
    )
  }

  private fun emitDistance(frame: Frame) {
    val image = runCatching { frame.acquireDepthImage16Bits() }.getOrNull() ?: return

    try {
      val plane = image.planes[0]
      val buffer = plane.buffer.asShortBuffer()

      // Sample the centre, matching where the reticle sits.
      val x = image.width / 2
      val y = image.height / 2
      val stride = plane.rowStride / 2
      val index = y * stride + x
      if (index >= buffer.limit()) return

      // ARCore reports depth in millimetres, low 3 bits confidence.
      val millimetres = buffer.get(index).toInt() and 0xFFFF
      if (millimetres <= 0) return

      onDistanceChange(
        mapOf(
          "meters" to millimetres / 1000.0,
          "confidence" to "medium"
        )
      )
    } finally {
      image.close()
    }
  }

  // MARK: - Orientation

  /** Zero when the top of the screen points at world up. */
  private fun rollDegrees(pose: FloatArray): Double {
    // displayOrientedPose defines +X as screen-right and +Y as screen-up.
    val up = rotate(pose, floatArrayOf(0f, 1f, 0f))
    val right = rotate(pose, floatArrayOf(1f, 0f, 0f))

    // How far world-up has leaned onto the screen's horizontal axis.
    return Math.toDegrees(atan2(right[1].toDouble(), up[1].toDouble()))
  }

  /** Applies the pose's rotation (not its translation) to a direction. */
  private fun rotate(pose: FloatArray, v: FloatArray): FloatArray {
    val out = floatArrayOf(
      pose[0] * v[0] + pose[4] * v[1] + pose[8] * v[2],
      pose[1] * v[0] + pose[5] * v[1] + pose[9] * v[2],
      pose[2] * v[0] + pose[6] * v[1] + pose[10] * v[2]
    )
    val length = sqrt(out[0] * out[0] + out[1] * out[1] + out[2] * out[2])
    if (length > 0f) for (i in 0..2) out[i] /= length
    return out
  }

  private fun reportUnavailable(error: Throwable) {
    if (unavailableReported) return
    unavailableReported = true
    latestDisplayPose = null
    latestTrackingState = null
    runCatching { session?.pause() }
    runCatching { session?.close() }
    session = null
    onAvailabilityChange(mapOf("worldTracking" to false, "lidar" to false))
    onTrackingStateChange(
      mapOf(
        "state" to "unavailable",
        "message" to (error.message ?: "ARCore camera unavailable.")
      )
    )
  }

  @Suppress("DEPRECATION")
  private fun displayRotation(): Int =
    (context.getSystemService(Context.WINDOW_SERVICE) as WindowManager)
      .defaultDisplay.rotation

  /** Rear-camera sensor orientation (90°) corrected for the display rotation. */
  private fun captureRotationDegrees(): Float = when (displayRotation()) {
    Surface.ROTATION_90 -> 0f
    Surface.ROTATION_180 -> 270f
    Surface.ROTATION_270 -> 180f
    else -> 90f
  }

  // MARK: - Stills

  private fun fulfilCapture(frame: Frame) {
    val callback = captureCallback ?: return
    captureCallback = null

    val image = runCatching { frame.acquireCameraImage() }.getOrNull()
    if (image == null) {
      callback(Result.failure(IllegalStateException("No camera frame available.")))
      return
    }

    try {
      val jpeg = ByteArrayOutputStream()
      YuvImage(yuv420ToNv21(image), ImageFormat.NV21, image.width, image.height, null)
        .compressToJpeg(Rect(0, 0, image.width, image.height), 95, jpeg)

      // acquireCameraImage is sensor-oriented. Rotate the still into the
      // current display orientation so portrait and landscape captures have
      // the same upright contract as the iOS implementation.
      val decoded = BitmapFactory.decodeByteArray(jpeg.toByteArray(), 0, jpeg.size())
        ?: throw IllegalStateException("Could not decode camera frame.")
      val rotation = captureRotationDegrees()
      val oriented = if (rotation == 0f) {
        decoded
      } else {
        Bitmap.createBitmap(
          decoded,
          0,
          0,
          decoded.width,
          decoded.height,
          BitmapMatrix().apply { postRotate(rotation) },
          true
        ).also { if (it !== decoded) decoded.recycle() }
      }

      val file = File(appContext?.cacheDirectory, "stereo-${UUID.randomUUID()}.jpg")
      FileOutputStream(file).use { output ->
        if (!oriented.compress(Bitmap.CompressFormat.JPEG, 95, output)) {
          throw IllegalStateException("Could not encode camera frame.")
        }
      }
      oriented.recycle()
      callback(Result.success("file://${file.absolutePath}"))
    } catch (error: Exception) {
      callback(Result.failure(error))
    } finally {
      image.close()
    }
  }

  /** Packs a YUV_420_888 image into NV21, which `YuvImage` can encode. */
  private fun yuv420ToNv21(image: android.media.Image): ByteArray {
    val width = image.width
    val height = image.height
    val output = ByteArray(width * height * 3 / 2)

    val yPlane = image.planes[0]
    val yBuffer = yPlane.buffer
    var offset = 0
    for (row in 0 until height) {
      yBuffer.position(row * yPlane.rowStride)
      yBuffer.get(output, offset, width)
      offset += width
    }

    // NV21 interleaves V then U at half resolution.
    val uPlane = image.planes[1]
    val vPlane = image.planes[2]
    val uBuffer = uPlane.buffer
    val vBuffer = vPlane.buffer

    for (row in 0 until height / 2) {
      for (col in 0 until width / 2) {
        val uvIndex = row * uPlane.rowStride + col * uPlane.pixelStride
        output[offset++] = vBuffer.get(uvIndex)
        output[offset++] = uBuffer.get(uvIndex)
      }
    }

    return output
  }

  private fun describe(state: TrackingState) = when (state) {
    TrackingState.TRACKING -> "normal"
    TrackingState.PAUSED -> "relocalizing"
    else -> "unavailable"
  }
}
