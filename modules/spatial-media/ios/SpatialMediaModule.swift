import ExpoModulesCore
import AVFoundation
import CoreImage
import CoreMedia
import CoreVideo
import ImageIO
import UniformTypeIdentifiers
import UIKit

public final class SpatialMediaModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SpatialMedia")

    AsyncFunction("inspect") { (uri: String) async throws -> [String: Any] in
      let url = try Self.fileURL(uri)

      if ["heic", "heif"].contains(url.pathExtension.lowercased()) {
        if try Self.isSpatialPhoto(url) {
          return ["kind": "spatial-photo", "spatial": true]
        }
        return ["kind": "image", "spatial": false]
      }

      if ["mov", "mp4", "m4v"].contains(url.pathExtension.lowercased()) {
        let asset = AVURLAsset(url: url)
        guard let track = try await asset.loadTracks(withMediaType: .video).first else {
          return ["kind": "video", "spatial": false]
        }
        let spatial: Bool
        if #available(iOS 17.2, *) {
          spatial = try await Self.containsStereoEyeBuffers(asset: asset, track: track)
        } else {
          spatial = false
        }
        return ["kind": spatial ? "spatial-video" : "video", "spatial": spatial]
      }

      if UIImage(contentsOfFile: url.path) != nil {
        return ["kind": "image", "spatial": false]
      }

      return ["kind": "unknown", "spatial": false]
    }

    AsyncFunction("splitSpatialPhoto") { (uri: String) async throws -> [String: Any] in
      let url = try Self.fileURL(uri)
      return try Self.splitSpatialPhoto(url)
    }

    AsyncFunction("splitSpatialVideo") { (uri: String) async throws -> [String: Any] in
      let url = try Self.fileURL(uri)
      if #available(iOS 17.2, *) {
        return try await Self.splitSpatialVideo(url)
      }
      throw SpatialMediaError.unsupportedOS
    }

    AsyncFunction("exportStereoPhoto") {
      (leftUri: String, rightUri: String, format: String) async throws -> String in
      let leftURL = try Self.fileURL(leftUri)
      let rightURL = try Self.fileURL(rightUri)
      return try Self.exportStereoPhoto(
        leftURL: leftURL,
        rightURL: rightURL,
        format: format
      ).absoluteString
    }
  }

  private static func fileURL(_ value: String) throws -> URL {
    if let url = URL(string: value), url.isFileURL {
      return url
    }
    if value.hasPrefix("/") {
      return URL(fileURLWithPath: value)
    }
    throw SpatialMediaError.invalidURL
  }

  private static func cacheURL(ext: String) -> URL {
    FileManager.default.temporaryDirectory
      .appendingPathComponent(UUID().uuidString)
      .appendingPathExtension(ext)
  }

  @available(iOS 17.2, *)
  private static func containsStereoEyeBuffers(
    asset: AVAsset,
    track: AVAssetTrack
  ) async throws -> Bool {
    let reader = try AVAssetReader(asset: asset)
    let output = AVAssetReaderTrackOutput(
      track: track,
      outputSettings: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
      ]
    )
    output.alwaysCopiesSampleData = false

    guard reader.canAdd(output) else { return false }
    reader.add(output)
    guard reader.startReading() else { return false }

    // Probe only the opening frames. A non-spatial clip previously forced a
    // decode of the entire movie before `inspect` could answer "no".
    var inspected = 0
    while inspected < 12, let sample = output.copyNextSampleBuffer() {
      inspected += 1
      if eyePair(from: sample) != nil {
        reader.cancelReading()
        return true
      }
    }

    reader.cancelReading()
    return false
  }

  // MARK: Spatial Photo

  private static func isSpatialPhoto(_ url: URL) throws -> Bool {
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else {
      throw SpatialMediaError.invalidImage
    }

    for index in 0..<CGImageSourceGetCount(source) {
      guard
        let properties = CGImageSourceCopyPropertiesAtIndex(source, index, nil) as? [CFString: Any],
        let groups = properties[kCGImagePropertyGroups] as? [CFString: Any]
      else { continue }

      if (groups[kCGImagePropertyGroupImageIsLeftImage] as? Bool) == true ||
         (groups[kCGImagePropertyGroupImageIsRightImage] as? Bool) == true {
        return true
      }
    }
    return false
  }

  private static func splitSpatialPhoto(_ url: URL) throws -> [String: Any] {
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else {
      throw SpatialMediaError.invalidImage
    }

    var left: CGImage?
    var right: CGImage?

    for index in 0..<CGImageSourceGetCount(source) {
      guard let image = CGImageSourceCreateImageAtIndex(source, index, nil) else {
        continue
      }

      let properties =
        CGImageSourceCopyPropertiesAtIndex(source, index, nil) as? [CFString: Any]
      let groups = properties?[kCGImagePropertyGroups] as? [CFString: Any]

      if (groups?[kCGImagePropertyGroupImageIsLeftImage] as? Bool) == true {
        left = image
      } else if (groups?[kCGImagePropertyGroupImageIsRightImage] as? Bool) == true {
        right = image
      }
    }

    guard let left, let right else {
      throw SpatialMediaError.notSpatialPhoto
    }

    let leftURL = try writeJPEG(left)
    let rightURL = try writeJPEG(right)

    return [
      "leftUri": leftURL.absoluteString,
      "rightUri": rightURL.absoluteString,
      "originalUri": url.absoluteString,
      "width": left.width,
      "height": left.height
    ]
  }

  private static func writeJPEG(
    _ image: CGImage,
    orientation: CGImagePropertyOrientation = .up
  ) throws -> URL {
    let url = cacheURL(ext: "jpg")
    guard let destination = CGImageDestinationCreateWithURL(
      url as CFURL,
      UTType.jpeg.identifier as CFString,
      1,
      nil
    ) else {
      throw SpatialMediaError.writeFailed
    }

    // Orientation has to be carried through explicitly: `CGImage` drops the
    // EXIF tag, so a portrait capture would otherwise export on its side.
    CGImageDestinationAddImage(
      destination,
      image,
      [
        kCGImageDestinationLossyCompressionQuality: 0.98,
        kCGImagePropertyOrientation: orientation.rawValue
      ] as CFDictionary
    )

    guard CGImageDestinationFinalize(destination) else {
      throw SpatialMediaError.writeFailed
    }
    return url
  }

  /// Loads a file as a `CGImage` already rotated upright, so downstream
  /// compositing never has to reason about EXIF.
  private static func loadUpright(_ url: URL) throws -> CGImage {
    guard let image = UIImage(contentsOfFile: url.path) else {
      throw SpatialMediaError.invalidImage
    }

    if image.imageOrientation == .up, let cgImage = image.cgImage {
      return cgImage
    }

    let format = UIGraphicsImageRendererFormat.preferred()
    format.scale = 1
    format.opaque = true

    let renderer = UIGraphicsImageRenderer(size: image.size, format: format)
    let upright = renderer.image { _ in
      image.draw(in: CGRect(origin: .zero, size: image.size))
    }

    guard let cgImage = upright.cgImage else {
      throw SpatialMediaError.invalidImage
    }
    return cgImage
  }

  // MARK: MV-HEVC

  @available(iOS 17.2, *)
  private static func splitSpatialVideo(_ url: URL) async throws -> [String: Any] {
    let asset = AVURLAsset(url: url)
    guard let videoTrack = try await asset.loadTracks(withMediaType: .video).first else {
      throw SpatialMediaError.noVideoTrack
    }

    let reader = try AVAssetReader(asset: asset)
    let output = AVAssetReaderTrackOutput(
      track: videoTrack,
      outputSettings: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
      ]
    )
    output.alwaysCopiesSampleData = false

    guard reader.canAdd(output) else {
      throw SpatialMediaError.readerSetupFailed
    }
    reader.add(output)

    guard reader.startReading() else {
      throw reader.error ?? SpatialMediaError.readerSetupFailed
    }

    guard let firstSample = output.copyNextSampleBuffer() else {
      throw reader.error ?? SpatialMediaError.noFrames
    }

    guard
      let firstPair = eyePair(from: firstSample),
      case .pixelBuffer(let firstLeft) = firstPair.left.buffer,
      case .pixelBuffer(let firstRight) = firstPair.right.buffer
    else {
      throw SpatialMediaError.notSpatialVideo
    }

    let width = CVPixelBufferGetWidth(firstLeft)
    let height = CVPixelBufferGetHeight(firstLeft)

    let leftURL = cacheURL(ext: "mov")
    let rightURL = cacheURL(ext: "mov")

    // The source audio rides along with the left eye. That makes the left
    // track the single playback master on the JS side: two decoders instead of
    // three, and no separate audio stream that can drift out of sync.
    let audioTrack = try await asset.loadTracks(withMediaType: .audio).first

    let leftWriter = try EyeWriter(
      url: leftURL,
      width: width,
      height: height,
      audioTrack: audioTrack
    )
    let rightWriter = try EyeWriter(url: rightURL, width: width, height: height)

    let firstPTS = firstSample.presentationTimeStamp
    try leftWriter.start(at: .zero)
    try rightWriter.start(at: .zero)

    try leftWriter.append(firstLeft, at: .zero)
    try rightWriter.append(firstRight, at: .zero)

    while let sample = output.copyNextSampleBuffer() {
      guard
        let pair = eyePair(from: sample),
        case .pixelBuffer(let leftBuffer) = pair.left.buffer,
        case .pixelBuffer(let rightBuffer) = pair.right.buffer
      else {
        continue
      }

      let pts = CMTimeSubtract(sample.presentationTimeStamp, firstPTS)
      try leftWriter.append(leftBuffer, at: pts)
      try rightWriter.append(rightBuffer, at: pts)
    }

    if reader.status == .failed {
      throw reader.error ?? SpatialMediaError.readFailed
    }

    if let audioTrack {
      // A second reader keeps the audio pass independent of the video pass; a
      // single reader would stall whenever one of its outputs went undrained.
      try leftWriter.appendAudio(from: asset, track: audioTrack, startingAt: firstPTS)
    }

    async let leftFinished: Void = leftWriter.finish()
    async let rightFinished: Void = rightWriter.finish()
    _ = try await (leftFinished, rightFinished)

    let duration = try await asset.load(.duration)

    return [
      "leftUri": leftURL.absoluteString,
      "rightUri": rightURL.absoluteString,
      "originalUri": url.absoluteString,
      "width": width,
      "height": height,
      "duration": duration.seconds
    ]
  }

  @available(iOS 17.2, *)
  private static func eyePair(
    from sampleBuffer: CMSampleBuffer
  ) -> (left: CMTaggedBuffer, right: CMTaggedBuffer)? {
    guard let tagged = sampleBuffer.taggedBuffers else {
      return nil
    }

    guard
      let left = tagged.first(where: {
        $0.tags.contains(.stereoView(.leftEye))
      }),
      let right = tagged.first(where: {
        $0.tags.contains(.stereoView(.rightEye))
      })
    else {
      return nil
    }

    return (left, right)
  }

  // MARK: Photo export

  private static func exportStereoPhoto(
    leftURL: URL,
    rightURL: URL,
    format: String
  ) throws -> URL {
    let left = try loadUpright(leftURL)
    let right = try loadUpright(rightURL)

    switch format {
    case "left_eye_only":
      return try writeJPEG(left)
    case "right_eye_only":
      return try writeJPEG(right)
    case "wigglegram_gif":
      return try writeWiggleGIF(left: left, right: right)
    case "anaglyph_color":
      return try writeJPEG(try anaglyph(left: left, right: right, mode: .color))
    case "anaglyph_half_color":
      return try writeJPEG(try anaglyph(left: left, right: right, mode: .halfColor))
    case "anaglyph_mono":
      return try writeJPEG(try anaglyph(left: left, right: right, mode: .mono))
    case "cross_eye":
      return try writeJPEG(
        try combine(left: right, right: left, fullResolution: true)
      )
    case "sbs_half":
      return try writeJPEG(
        try combine(left: left, right: right, fullResolution: false)
      )
    default:
      return try writeJPEG(
        try combine(left: left, right: right, fullResolution: true)
      )
    }
  }

  private static func combine(
    left: CGImage,
    right: CGImage,
    fullResolution: Bool
  ) throws -> CGImage {
    let eyeWidth = min(left.width, right.width)
    let eyeHeight = min(left.height, right.height)
    let outputWidth = fullResolution ? eyeWidth * 2 : eyeWidth
    let outputHeight = eyeHeight

    // Without an explicit scale the renderer inherits the main screen's, so a
    // 4032 px pair came out as a 12096 px file on a 3x device.
    let format = UIGraphicsImageRendererFormat.preferred()
    format.scale = 1
    format.opaque = true

    let renderer = UIGraphicsImageRenderer(
      size: CGSize(width: outputWidth, height: outputHeight),
      format: format
    )

    let image = renderer.image { _ in
      let half = CGFloat(outputWidth) / 2
      UIImage(cgImage: left).draw(
        in: CGRect(x: 0, y: 0, width: half, height: CGFloat(outputHeight))
      )
      UIImage(cgImage: right).draw(
        in: CGRect(x: half, y: 0, width: half, height: CGFloat(outputHeight))
      )
    }

    guard let cgImage = image.cgImage else {
      throw SpatialMediaError.writeFailed
    }
    return cgImage
  }

  enum AnaglyphMode {
    case color
    case halfColor
    case mono
  }

  /// Mirrors the on-device anaglyph exactly: each eye is reduced to the
  /// channels it is allowed to contribute, then the two are added. Because the
  /// channel sets are disjoint, addition cannot clip.
  private static func anaglyph(
    left: CGImage,
    right: CGImage,
    mode: AnaglyphMode
  ) throws -> CGImage {
    let context = CIContext()
    var leftCI = CIImage(cgImage: left)
    var rightCI = CIImage(cgImage: right)

    switch mode {
    case .color:
      break
    case .halfColor:
      // Desaturating the red eye cuts retinal rivalry without going grey.
      leftCI = leftCI.applyingFilter(
        "CIColorControls",
        parameters: [kCIInputSaturationKey: 0.35]
      )
    case .mono:
      leftCI = leftCI.applyingFilter("CIPhotoEffectMono")
      rightCI = rightCI.applyingFilter("CIPhotoEffectMono")
    }

    let red = leftCI.applyingFilter(
      "CIColorMatrix",
      parameters: [
        "inputRVector": CIVector(x: 1, y: 0, z: 0, w: 0),
        "inputGVector": CIVector(x: 0, y: 0, z: 0, w: 0),
        "inputBVector": CIVector(x: 0, y: 0, z: 0, w: 0)
      ]
    )

    let cyan = rightCI.applyingFilter(
      "CIColorMatrix",
      parameters: [
        "inputRVector": CIVector(x: 0, y: 0, z: 0, w: 0),
        "inputGVector": CIVector(x: 0, y: 1, z: 0, w: 0),
        "inputBVector": CIVector(x: 0, y: 0, z: 1, w: 0)
      ]
    )

    let combined = red.applyingFilter(
      "CIAdditionCompositing",
      parameters: [kCIInputBackgroundImageKey: cyan]
    )

    guard let cgImage = context.createCGImage(
      combined,
      from: leftCI.extent.intersection(rightCI.extent)
    ) else {
      throw SpatialMediaError.writeFailed
    }

    return cgImage
  }

  private static func writeWiggleGIF(
    left: CGImage,
    right: CGImage
  ) throws -> URL {
    let url = cacheURL(ext: "gif")
    guard let destination = CGImageDestinationCreateWithURL(
      url as CFURL,
      UTType.gif.identifier as CFString,
      8,
      nil
    ) else {
      throw SpatialMediaError.writeFailed
    }

    let gifProperties: [CFString: Any] = [
      kCGImagePropertyGIFDictionary: [
        kCGImagePropertyGIFLoopCount: 0
      ]
    ]
    CGImageDestinationSetProperties(
      destination,
      gifProperties as CFDictionary
    )

    let frameProperties: [CFString: Any] = [
      kCGImagePropertyGIFDictionary: [
        kCGImagePropertyGIFDelayTime: 0.10
      ]
    ]

    for index in 0..<8 {
      CGImageDestinationAddImage(
        destination,
        index.isMultiple(of: 2) ? left : right,
        frameProperties as CFDictionary
      )
    }

    guard CGImageDestinationFinalize(destination) else {
      throw SpatialMediaError.writeFailed
    }
    return url
  }
}

@available(iOS 17.2, *)
private final class EyeWriter {
  let writer: AVAssetWriter
  let input: AVAssetWriterInput
  let adaptor: AVAssetWriterInputPixelBufferAdaptor
  private var audioInput: AVAssetWriterInput?

  init(
    url: URL,
    width: Int,
    height: Int,
    audioTrack: AVAssetTrack? = nil
  ) throws {
    writer = try AVAssetWriter(outputURL: url, fileType: .mov)
    input = AVAssetWriterInput(
      mediaType: .video,
      outputSettings: [
        AVVideoCodecKey: AVVideoCodecType.hevc,
        AVVideoWidthKey: width,
        AVVideoHeightKey: height
      ]
    )
    input.expectsMediaDataInRealTime = false

    adaptor = AVAssetWriterInputPixelBufferAdaptor(
      assetWriterInput: input,
      sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: width,
        kCVPixelBufferHeightKey as String: height
      ]
    )

    guard writer.canAdd(input) else {
      throw SpatialMediaError.writerSetupFailed
    }
    writer.add(input)

    if audioTrack != nil {
      let audio = AVAssetWriterInput(
        mediaType: .audio,
        outputSettings: [
          AVFormatIDKey: kAudioFormatMPEG4AAC,
          AVNumberOfChannelsKey: 2,
          AVSampleRateKey: 44_100,
          AVEncoderBitRateKey: 128_000
        ]
      )
      audio.expectsMediaDataInRealTime = false
      if writer.canAdd(audio) {
        writer.add(audio)
        audioInput = audio
      }
    }
  }

  /// Transcodes the source audio into this writer, rebased to the same zero
  /// point the video frames were rebased to.
  func appendAudio(
    from asset: AVAsset,
    track: AVAssetTrack,
    startingAt firstPTS: CMTime
  ) throws {
    guard let audioInput else { return }

    let reader = try AVAssetReader(asset: asset)
    let output = AVAssetReaderTrackOutput(
      track: track,
      outputSettings: [
        AVFormatIDKey: kAudioFormatLinearPCM,
        AVLinearPCMBitDepthKey: 16,
        AVLinearPCMIsFloatKey: false,
        AVLinearPCMIsBigEndianKey: false,
        AVLinearPCMIsNonInterleaved: false
      ]
    )

    guard reader.canAdd(output) else { return }
    reader.add(output)
    guard reader.startReading() else { return }

    while let sample = output.copyNextSampleBuffer() {
      while !audioInput.isReadyForMoreMediaData {
        if writer.status == .failed {
          throw writer.error ?? SpatialMediaError.writeFailed
        }
        Thread.sleep(forTimeInterval: 0.002)
      }

      let rebased = try? CMSampleBuffer(
        copying: sample,
        withNewTiming: timingInfo(for: sample, offsetBy: firstPTS)
      )
      audioInput.append(rebased ?? sample)
    }

    audioInput.markAsFinished()
    self.audioInput = nil
  }

  private func timingInfo(
    for sample: CMSampleBuffer,
    offsetBy firstPTS: CMTime
  ) -> [CMSampleTimingInfo] {
    (try? sample.sampleTimingInfos())?.map { info in
      var shifted = info
      shifted.presentationTimeStamp = CMTimeSubtract(info.presentationTimeStamp, firstPTS)
      if info.decodeTimeStamp.isValid {
        shifted.decodeTimeStamp = CMTimeSubtract(info.decodeTimeStamp, firstPTS)
      }
      return shifted
    } ?? []
  }

  func start(at time: CMTime) throws {
    guard writer.startWriting() else {
      throw writer.error ?? SpatialMediaError.writerSetupFailed
    }
    writer.startSession(atSourceTime: time)
  }

  func append(_ buffer: CVPixelBuffer, at time: CMTime) throws {
    while !input.isReadyForMoreMediaData {
      if writer.status == .failed {
        throw writer.error ?? SpatialMediaError.writeFailed
      }
      Thread.sleep(forTimeInterval: 0.002)
    }

    guard adaptor.append(buffer, withPresentationTime: time) else {
      throw writer.error ?? SpatialMediaError.writeFailed
    }
  }

  func finish() async throws {
    input.markAsFinished()
    audioInput?.markAsFinished()
    await writer.finishWriting()
    if writer.status == .failed {
      throw writer.error ?? SpatialMediaError.writeFailed
    }
  }
}

private enum SpatialMediaError: LocalizedError {
  case invalidURL
  case invalidImage
  case notSpatialPhoto
  case notSpatialVideo
  case unsupportedOS
  case noVideoTrack
  case readerSetupFailed
  case writerSetupFailed
  case noFrames
  case readFailed
  case writeFailed

  var errorDescription: String? {
    switch self {
    case .invalidURL: return "The media URL is invalid."
    case .invalidImage: return "The image could not be opened."
    case .notSpatialPhoto: return "This file is not an Apple spatial photo."
    case .notSpatialVideo: return "This file does not contain MV-HEVC stereo eye buffers."
    case .unsupportedOS: return "Spatial video extraction requires iOS 17.2 or newer."
    case .noVideoTrack: return "No video track was found."
    case .readerSetupFailed: return "The spatial video reader could not be configured."
    case .writerSetupFailed: return "The eye video writer could not be configured."
    case .noFrames: return "The video contains no readable frames."
    case .readFailed: return "The spatial video could not be decoded."
    case .writeFailed: return "The stereo export could not be written."
    }
  }
}
