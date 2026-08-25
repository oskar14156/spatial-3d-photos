package expo.modules.spatialmedia

import android.graphics.Bitmap
import android.graphics.Color
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * Small, dependency-free GIF writer for the two-frame wigglegram export.
 *
 * Android can decode animated GIFs through the image stack, but it does not
 * expose a platform GIF encoder. A fixed 3-3-2 palette keeps this exporter
 * deterministic and avoids adding another large native dependency just for
 * eight alternating frames.
 */
internal object AnimatedGifEncoder {
  private const val MAX_DIMENSION = 720
  private const val FRAME_COUNT = 8
  private const val FRAME_DELAY_CENTISECONDS = 10
  private const val CLEAR_CODE = 256
  private const val END_CODE = 257
  private const val LZW_CODE_SIZE = 9

  fun write(file: File, left: Bitmap, right: Bitmap) {
    val sourceWidth = min(left.width, right.width)
    val sourceHeight = min(left.height, right.height)
    require(sourceWidth > 0 && sourceHeight > 0) { "The stereo images are empty." }

    val scale = min(1f, MAX_DIMENSION.toFloat() / max(sourceWidth, sourceHeight))
    val width = max(1, (sourceWidth * scale).roundToInt())
    val height = max(1, (sourceHeight * scale).roundToInt())

    FileOutputStream(file).use { output ->
      writeHeader(output, width, height)
      writePalette(output)
      writeLoopExtension(output)

      repeat(FRAME_COUNT) { index ->
        writeGraphicsControlExtension(output)
        writeImageDescriptor(output, width, height)
        output.write(8) // 256-colour global table => minimum LZW size 8.

        val lzw = GifLzwStream(output)
        writeFramePixels(
          lzw,
          if (index % 2 == 0) left else right,
          sourceWidth,
          sourceHeight,
          width,
          height
        )
        lzw.finish()
      }

      output.write(0x3B) // GIF trailer.
    }
  }

  private fun writeHeader(output: OutputStream, width: Int, height: Int) {
    output.write("GIF89a".toByteArray(Charsets.US_ASCII))
    writeShort(output, width)
    writeShort(output, height)
    // Global table, 8 bits per primary colour, 256 entries, no transparency.
    output.write(0xF7)
    output.write(0)
    output.write(0)
  }

  private fun writePalette(output: OutputStream) {
    for (index in 0 until 256) {
      val red = ((index shr 5) and 0x07) * 255 / 7
      val green = ((index shr 2) and 0x07) * 255 / 7
      val blue = (index and 0x03) * 255 / 3
      output.write(red)
      output.write(green)
      output.write(blue)
    }
  }

  private fun writeLoopExtension(output: OutputStream) {
    output.write(0x21)
    output.write(0xFF)
    output.write(11)
    output.write("NETSCAPE2.0".toByteArray(Charsets.US_ASCII))
    output.write(3)
    output.write(1)
    writeShort(output, 0) // Loop forever.
    output.write(0)
  }

  private fun writeGraphicsControlExtension(output: OutputStream) {
    output.write(0x21)
    output.write(0xF9)
    output.write(4)
    output.write(0x04) // No transparency; each frame replaces the full canvas.
    writeShort(output, FRAME_DELAY_CENTISECONDS)
    output.write(0) // No transparent colour.
    output.write(0)
  }

  private fun writeImageDescriptor(output: OutputStream, width: Int, height: Int) {
    output.write(0x2C)
    writeShort(output, 0)
    writeShort(output, 0)
    writeShort(output, width)
    writeShort(output, height)
    output.write(0) // Use the global palette; no interlacing.
  }

  private fun writeFramePixels(
    lzw: GifLzwStream,
    bitmap: Bitmap,
    sourceWidth: Int,
    sourceHeight: Int,
    width: Int,
    height: Int
  ) {
    val row = IntArray(sourceWidth)
    for (targetY in 0 until height) {
      val sourceY = min(sourceHeight - 1, targetY * sourceHeight / height)
      bitmap.getPixels(row, 0, sourceWidth, 0, sourceY, sourceWidth, 1)
      for (targetX in 0 until width) {
        val sourceX = min(sourceWidth - 1, targetX * sourceWidth / width)
        val pixel = row[sourceX]
        lzw.writeCode(CLEAR_CODE)
        lzw.writeCode(paletteIndex(pixel))
      }
    }
    lzw.writeCode(END_CODE)
  }

  private fun paletteIndex(pixel: Int): Int {
    val red = Color.red(pixel) * 7 / 255
    val green = Color.green(pixel) * 7 / 255
    val blue = Color.blue(pixel) * 3 / 255
    return (red shl 5) or (green shl 2) or blue
  }

  private fun writeShort(output: OutputStream, value: Int) {
    output.write(value and 0xFF)
    output.write((value shr 8) and 0xFF)
  }

  /** Streams 9-bit clear/pixel codes into GIF data sub-blocks. */
  private class GifLzwStream(private val output: OutputStream) {
    private val block = ByteArray(255)
    private var blockSize = 0
    private var bitBuffer = 0
    private var bitCount = 0

    fun writeCode(code: Int) {
      bitBuffer = bitBuffer or (code shl bitCount)
      bitCount += LZW_CODE_SIZE
      while (bitCount >= 8) {
        writeDataByte(bitBuffer and 0xFF)
        bitBuffer = bitBuffer ushr 8
        bitCount -= 8
      }
    }

    fun finish() {
      if (bitCount > 0) writeDataByte(bitBuffer and 0xFF)
      flushBlock()
      output.write(0)
    }

    private fun writeDataByte(value: Int) {
      block[blockSize++] = value.toByte()
      if (blockSize == block.size) flushBlock()
    }

    private fun flushBlock() {
      if (blockSize == 0) return
      output.write(blockSize)
      output.write(block, 0, blockSize)
      blockSize = 0
    }
  }
}
