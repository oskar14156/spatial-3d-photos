import ExpoModulesCore
import AVFoundation
import CoreImage
import CoreMedia
import CoreVideo
import VideoToolbox
import Photos
import ImageIO
import UniformTypeIdentifiers
import UIKit

public final class SpatialMediaModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SpatialMedia")

    /**
     Copies a library asset's *original* file into the app's temporary
     directory and resolves with its `file://` URI.

     Two reasons this has to go through PhotoKit rather than reading the path
     MediaLibrary reports. The obvious one: that path lives inside the Photos
     container, outside the app sandbox, so opening a video there fails with
     "you don't have permission to view it". The important one: only the
     original resource still carries the stereo payload — anything iOS hands
     over as a convenience copy has already been transcoded, and transcoding
     is exactly what strips the HEIC image groups and the second MV-HEVC layer.
     */
    AsyncFunction("exportOriginal") { (localIdentifier: String, promise: Promise) in
      let assets = PHAsset.fetchAssets(
        withLocalIdentifiers: [localIdentifier],
        options: nil
      )

      guard let asset = assets.firstObject else {
        promise.reject("ERR_SPATIAL_MEDIA", "Asset not found in the photo library.")
        return
      }

      guard let resource = Self.originalResource(for: asset) else {
        promise.reject("ERR_SPATIAL_MEDIA", "Asset has no readable original.")
        return
      }

      let ext = (resource.originalFilename as NSString).pathExtension
      let destination = FileManager.default.temporaryDirectory
        .appendingPathComponent(
          "original-\(UUID().uuidString).\(ext.isEmpty ? "dat" : ext)"
        )

      let options = PHAssetResourceRequestOptions()
      // iCloud-only assets are common; fetch rather than fail on them.
      options.isNetworkAccessAllowed = true

      PHAssetResourceManager.default().writeData(
        for: resource,
        toFile: destination,
        options: options
      ) { error in
        if let error {
          promise.reject("ERR_SPATIAL_MEDIA", error.localizedDescription)
        } else {
          promise.resolve(destination.absoluteString)
        }
      }
    }

    /// Deletes a copy made by `exportOriginal`, so probing a large library
    /// does not leave every candidate sitting in temporary storage.
    AsyncFunction("discardTemporary") { (uri: String) in
      guard let url = URL(string: uri), url.isFileURL else { return }

      // Only ever delete inside our own temporary directory.
      let temporary = FileManager.default.temporaryDirectory.standardizedFileURL.path
      guard url.standardizedFileURL.path.hasPrefix(temporary) else { return }

      try? FileManager.default.removeItem(at: url)
    }

    AsyncFunction("inspect") { (uri: String) async throws -> [String: Any] in
      let url = try Self.fileURL(uri)
      let ext = url.pathExtension.lowercased()

      // Probe by content rather than by file name. Extension gating used to
      // skip the stereo check whenever the picker handed back a `.jpg`, and a
      // renamed or extension-less original was never even considered.
      if ["mov", "mp4", "m4v"].contains(ext) {
        let asset = AVURLAsset(url: url)
        guard let track = try await asset.loadTracks(withMediaType: .video).first else {
          return ["kind": "video", "spatial": false, "transcoded": false]
        }

        var spatial = false
        if #available(iOS 17.2, *) {
          spatial = try await Self.containsStereoEyeBuffers(asset: asset, track: track)
        }

        // H.264 is the picker's transcode target; a genuine spatial capture is
        // always HEVC, so this tells the caller the original was lost.
        var transcoded = false
        if !spatial {
          transcoded = (try? await Self.isTranscodedVideo(track)) ?? false
        }

        return [
          "kind": spatial ? "spatial-video" : "video",
          "spatial": spatial,
          "transcoded": transcoded
        ]
      }

      if let source = CGImageSourceCreateWithURL(url as CFURL, nil),
         CGImageSourceGetCount(source) > 0 {
        let spatial = Self.stereoPairIndices(source) != nil
        return [
          "kind": spatial ? "spatial-photo" : "image",
          "spatial": spatial,
          // A spatial photo is always HEIC; a JPEG cannot carry the pairing.
          "transcoded": !spatial && !["heic", "heif"].contains(ext)
        ]
      }

      return ["kind": "unknown", "spatial": false, "transcoded": false]
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

  /// The resource holding the untouched original bytes.
  ///
  /// `.photo` and `.video` are the originals; the `fullSize*` variants are
  /// renditions Photos produced after an edit, and an adjusted asset keeps
  /// both. Preferring the original is what keeps a spatial photo spatial.
  private static func originalResource(for asset: PHAsset) -> PHAssetResource? {
    let resources = PHAssetResource.assetResources(for: asset)
    let preferred: [PHAssetResourceType] = asset.mediaType == .video
      ? [.video, .fullSizeVideo]
      : [.photo, .fullSizePhoto]

    for type in preferred {
      if let match = resources.first(where: { $0.type == type }) { return match }
    }
    return resources.first
  }

  /// True when the track is H.264, which spatial captures never are.
  private static func isTranscodedVideo(_ track: AVAssetTrack) async throws -> Bool {
    let descriptions = try await track.load(.formatDescriptions)
    return descriptions.contains { description in
      let codec = CMFormatDescriptionGetMediaSubType(description)
      return codec == kCMVideoCodecType_H264
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

  /// Output settings that make the decoder emit *both* MV-HEVC eye layers.
  ///
  /// This is the whole ball game for spatial video: without an explicit
  /// `RequestedMVHEVCVideoLayerIDs`, VideoToolbox decodes only the base layer
  /// and `CMSampleBuffer.taggedBuffers` is always nil — so every spatial clip
  /// looked like an ordinary video and was rejected on import.
  @available(iOS 17.2, *)
  private static var stereoOutputSettings: [String: Any] {
    [
      kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
      AVVideoDecompressionPropertiesKey: [
        kVTDecompressionPropertyKey_RequestedMVHEVCVideoLayerIDs as String: [0, 1]
      ]
    ]
  }

  @available(iOS 17.2, *)
  private static func containsStereoEyeBuffers(
    asset: AVAsset,
    track: AVAssetTrack
  ) async throws -> Bool {
    let reader = try AVAssetReader(asset: asset)
    let output = AVAssetReaderTrackOutput(
      track: track,
      outputSettings: stereoOutputSettings
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

  /// Indices of the two eye images inside a spatial HEIC.
  ///
  /// The stereo pairing is published as a *container* property — an array of
  /// group dictionaries, each naming the left and right image index. Reading
  /// `kCGImagePropertyGroups` per image index (as this used to) never matches,
  /// which is why every spatial photo was reported as an ordinary image.
  private static func stereoPairIndices(_ source: CGImageSource) -> (left: Int, right: Int)? {
    guard
      let properties = CGImageSourceCopyProperties(source, nil) as? [CFString: Any],
      let groups = properties[kCGImagePropertyGroups] as? [[CFString: Any]]
    else { return nil }

    for group in groups {
      let type = group[kCGImagePropertyGroupType] as? String
      guard type == (kCGImagePropertyGroupTypeStereoPair as String) else { continue }

      if let left = group[kCGImagePropertyGroupImageIndexLeft] as? Int,
         let right = group[kCGImagePropertyGroupImageIndexRight] as? Int {
        return (left, right)
      }
    }

    return nil
  }

  private static func isSpatialPhoto(_ url: URL) throws -> Bool {
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else {
      throw SpatialMediaError.invalidImage
    }
    return stereoPairIndices(source) != nil
  }

  private static func splitSpatialPhoto(_ url: URL) throws -> [String: Any] {
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else {
      throw SpatialMediaError.invalidImage
    }

    guard let indices = stereoPairIndices(source) else {
      throw SpatialMediaError.notSpatialPhoto
    }

    guard
      let left = CGImageSourceCreateImageAtIndex(source, indices.left, nil),
      let right = CGImageSourceCreateImageAtIndex(source, indices.right, nil)
    else {
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
      outputSettings: stereoOutputSettings
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
