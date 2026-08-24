package expo.modules.spatialmedia

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.Rect
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import androidx.exifinterface.media.ExifInterface
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream
import java.util.UUID

class SpatialMediaException(message: String) :
  CodedException("ERR_SPATIAL_MEDIA", message, null)

/**
 * Android counterpart of the iOS spatial media module.
 *
 * Deliberately narrower than iOS: Android has no public API for reading
 * Apple's HEIC stereo image groups, and no MediaCodec path that reliably
 * exposes the second MV-HEVC layer. Rather than pretend, `inspect` reports
 * those files as ordinary media and flags them as `unsupportedPlatform`, so
 * the UI can say why instead of silently importing a mono copy.
 *
 * Everything that does not depend on Apple's containers behaves identically
 * to iOS: every export format is here, and side-by-side splitting runs in
 * shared JavaScript through expo-image-manipulator on both platforms.
 */
class SpatialMediaModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SpatialMedia")

    /**
     * Copies a library item into the app cache and resolves with its file URI.
     *
     * Mirrors the iOS entry point so the shared JavaScript has no platform
     * branch. Here the reason is scoped storage rather than the Photos
     * sandbox: a `content://` URI is readable through the resolver but not by
     * anything that wants a plain path.
     */
    AsyncFunction("exportOriginal") { identifier: String ->
      val resolver = appContext.reactContext?.contentResolver
        ?: throw SpatialMediaException("No content resolver available.")

      val source = android.net.Uri.parse(identifier)
      val extension = source.lastPathSegment
        ?.substringAfterLast('.', "")
        ?.takeIf { it.isNotEmpty() && it.length <= 5 }
        ?: "dat"

      val destination = File(
        appContext.cacheDirectory,
        "original-${UUID.randomUUID()}.$extension"
      )

      resolver.openInputStream(source).use { input ->
        if (input == null) throw SpatialMediaException("Could not open $identifier.")
        FileOutputStream(destination).use { output -> input.copyTo(output) }
      }

      "file://${destination.absolutePath}"
    }

    /** Deletes a copy made by `exportOriginal`. */
    AsyncFunction("discardTemporary") { uri: String ->
      val path = uri.removePrefix("file://")
      val cache = appContext.cacheDirectory?.absolutePath ?: return@AsyncFunction
      // Only ever delete inside our own cache directory.
      if (path.startsWith(cache)) File(path).delete()
    }

    AsyncFunction("inspect") { uri: String ->
      val file = resolve(uri)
      val name = file.name.lowercase()

      when {
        name.endsWith(".mov") || name.endsWith(".mp4") || name.endsWith(".m4v") -> {
          mapOf(
            "kind" to "video",
            "spatial" to false,
            "transcoded" to false,
            "unsupportedPlatform" to isLikelyAppleSpatialVideo(file)
          )
        }
        else -> {
          val bounds = decodeBounds(file)
            ?: return@AsyncFunction mapOf(
              "kind" to "unknown",
              "spatial" to false,
              "transcoded" to false,
              "unsupportedPlatform" to false
            )

          mapOf(
            "kind" to "image",
            "spatial" to false,
            "transcoded" to false,
            // A multi-image HEIC is almost certainly an Apple spatial photo,
            // which is exactly the case Android cannot open.
            "unsupportedPlatform" to
              (name.endsWith(".heic") || name.endsWith(".heif")),
            "width" to bounds.width(),
            "height" to bounds.height()
          )
        }
      }
    }

    AsyncFunction("splitSpatialPhoto") { _: String ->
      throw SpatialMediaException(
        "Apple spatial photos cannot be opened on Android: the stereo pairing " +
          "lives in HEIC image groups that no public Android API exposes."
      )
    }

    AsyncFunction("splitSpatialVideo") { _: String ->
      throw SpatialMediaException(
        "MV-HEVC spatial video cannot be split on Android: MediaCodec decodes " +
          "only the base layer."
      )
    }

    AsyncFunction("exportStereoPhoto") { leftUri: String, rightUri: String, format: String ->
      val left = decodeBitmap(resolve(leftUri))
      val right = decodeBitmap(resolve(rightUri))

      val output = when (format) {
        "sbs_full" -> combine(left, right, halfWidth = false)
        "sbs_half" -> combine(left, right, halfWidth = true)
        "cross_eye" -> combine(right, left, halfWidth = false)
        "anaglyph_color" -> anaglyph(left, right, AnaglyphMode.COLOR)
        "anaglyph_half_color" -> anaglyph(left, right, AnaglyphMode.HALF_COLOR)
        "anaglyph_mono" -> anaglyph(left, right, AnaglyphMode.MONO)
        "left_eye_only" -> left
        "right_eye_only" -> right
        else -> throw SpatialMediaException("Unknown export format: $format")
      }

      val uri = writeJpeg(output)
      if (output !== left) left.recycle()
      if (output !== right) right.recycle()
      output.recycle()
      uri
    }
  }

  // MARK: - Helpers

  private fun resolve(uri: String): File {
    val path = uri.removePrefix("file://")
    val file = File(path)
    if (!file.exists()) throw SpatialMediaException("File not found: $path")
    return file
  }

  private fun decodeBounds(file: File): Rect? {
    val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(file.path, options)
    if (options.outWidth <= 0) return null
    return Rect(0, 0, options.outWidth, options.outHeight)
  }

  /**
   * Decodes and applies the EXIF rotation.
   *
   * `BitmapFactory` ignores orientation entirely, so a portrait capture would
   * otherwise be split and exported on its side — the same bug the iOS
   * exporter had before it started carrying orientation through.
   */
  private fun decodeBitmap(file: File): Bitmap {
    val bitmap = BitmapFactory.decodeFile(file.path)
      ?: throw SpatialMediaException("Could not decode image: ${file.name}")

    val orientation = runCatching {
      ExifInterface(file.path).getAttributeInt(
        ExifInterface.TAG_ORIENTATION,
        ExifInterface.ORIENTATION_NORMAL
      )
    }.getOrDefault(ExifInterface.ORIENTATION_NORMAL)

    val matrix = android.graphics.Matrix()
    when (orientation) {
      ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
      ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
      ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
      ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.postScale(-1f, 1f)
      ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.postScale(1f, -1f)
      else -> return bitmap
    }

    val rotated = Bitmap.createBitmap(
      bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true
    )
    if (rotated !== bitmap) bitmap.recycle()
    return rotated
  }

  /** True when a movie carries an HEVC track, the only spatial candidate. */
  private fun isLikelyAppleSpatialVideo(file: File): Boolean {
    val extractor = MediaExtractor()
    return try {
      extractor.setDataSource(file.path)
      (0 until extractor.trackCount).any { index ->
        val mime = extractor.getTrackFormat(index).getString(MediaFormat.KEY_MIME)
        mime == MediaFormat.MIMETYPE_VIDEO_HEVC
      }
    } catch (_: Exception) {
      false
    } finally {
      runCatching { extractor.release() }
    }
  }

  /**
   * Writes the two eyes side by side at their true pixel size.
   *
   * `halfWidth` squeezes each eye horizontally for the anamorphic layout VR
   * players expect, leaving the overall frame the size of a single eye.
   */
  private fun combine(left: Bitmap, right: Bitmap, halfWidth: Boolean): Bitmap {
    val height = minOf(left.height, right.height)
    val eyeWidth = if (halfWidth) {
      minOf(left.width, right.width) / 2
    } else {
      minOf(left.width, right.width)
    }

    val output = Bitmap.createBitmap(eyeWidth * 2, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(output)
    canvas.drawColor(Color.BLACK)

    val paint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)
    canvas.drawBitmap(left, null, Rect(0, 0, eyeWidth, height), paint)
    canvas.drawBitmap(right, null, Rect(eyeWidth, 0, eyeWidth * 2, height), paint)
    return output
  }

  private enum class AnaglyphMode { COLOR, HALF_COLOR, MONO }

  /**
   * Red/cyan anaglyph by true channel separation.
   *
   * The left eye keeps red, the right keeps green and blue, then the two are
   * added. Because the channel sets are disjoint, additive blending is exact —
   * there is no double-counting to correct for. This mirrors the iOS
   * implementation so an export matches what the viewer showed.
   */
  private fun anaglyph(left: Bitmap, right: Bitmap, mode: AnaglyphMode): Bitmap {
    val width = minOf(left.width, right.width)
    val height = minOf(left.height, right.height)

    val output = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(output)
    canvas.drawColor(Color.BLACK)

    val destination = Rect(0, 0, width, height)

    val leftPaint = Paint(Paint.FILTER_BITMAP_FLAG).apply {
      colorFilter = ColorMatrixColorFilter(leftMatrix(mode))
    }
    canvas.drawBitmap(left, null, destination, leftPaint)

    val rightPaint = Paint(Paint.FILTER_BITMAP_FLAG).apply {
      colorFilter = ColorMatrixColorFilter(rightMatrix(mode))
      xfermode = PorterDuffXfermode(PorterDuff.Mode.ADD)
    }
    canvas.drawBitmap(right, null, destination, rightPaint)

    return output
  }

  /** Luma weights, used when a mode collapses an eye to greyscale first. */
  private val lr = 0.299f
  private val lg = 0.587f
  private val lb = 0.114f

  private fun leftMatrix(mode: AnaglyphMode) = when (mode) {
    // Keep the red channel as it is; discard green and blue.
    AnaglyphMode.COLOR -> ColorMatrix(
      floatArrayOf(
        1f, 0f, 0f, 0f, 0f,
        0f, 0f, 0f, 0f, 0f,
        0f, 0f, 0f, 0f, 0f,
        0f, 0f, 0f, 1f, 0f
      )
    )
    // Feed luminance into red, which kills retinal rivalry on saturated reds.
    AnaglyphMode.HALF_COLOR, AnaglyphMode.MONO -> ColorMatrix(
      floatArrayOf(
        lr, lg, lb, 0f, 0f,
        0f, 0f, 0f, 0f, 0f,
        0f, 0f, 0f, 0f, 0f,
        0f, 0f, 0f, 1f, 0f
      )
    )
  }

  private fun rightMatrix(mode: AnaglyphMode) = when (mode) {
    AnaglyphMode.COLOR, AnaglyphMode.HALF_COLOR -> ColorMatrix(
      floatArrayOf(
        0f, 0f, 0f, 0f, 0f,
        0f, 1f, 0f, 0f, 0f,
        0f, 0f, 1f, 0f, 0f,
        0f, 0f, 0f, 1f, 0f
      )
    )
    AnaglyphMode.MONO -> ColorMatrix(
      floatArrayOf(
        0f, 0f, 0f, 0f, 0f,
        lr, lg, lb, 0f, 0f,
        lr, lg, lb, 0f, 0f,
        0f, 0f, 0f, 1f, 0f
      )
    )
  }

  private fun writeJpeg(bitmap: Bitmap): String {
    val file = File(
      appContext.cacheDirectory,
      "stereo-${UUID.randomUUID()}.jpg"
    )
    FileOutputStream(file).use { stream ->
      bitmap.compress(Bitmap.CompressFormat.JPEG, 95, stream)
    }
    return "file://${file.absolutePath}"
  }
}
