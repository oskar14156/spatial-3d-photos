import ARKit
import ExpoModulesCore
import UIKit

/**
 The viewfinder for Cha-Cha stereo capture.

 A single ARKit session backs everything the capture screen needs, which is why
 this replaced the plain camera preview: world tracking is the only thing that
 can tell the photographer how far they have *actually* moved between the two
 shots, and the same session hands us LiDAR subject distance, a gravity-derived
 horizon, and full-resolution stills.
 */
final class SpatialCaptureView: ExpoView, ARSessionDelegate {
  private let sceneView = ARSCNView(frame: .zero)

  private var active = false
  private var lastTelemetry: TimeInterval = 0

  /// Camera pose recorded at the first shot; displacement is measured from it.
  private var anchorTransform: simd_float4x4?

  /// Smoothed lateral/vertical/forward displacement, in metres.
  private var smoothedOffset = simd_float3(repeating: 0)

  /// Read on the session queue, so it is cached from the main thread instead
  /// of touching UIKit off-thread.
  private var interfaceOrientation: UIInterfaceOrientation = .portrait

  let onDistanceChange = EventDispatcher()
  let onAvailabilityChange = EventDispatcher()
  let onMotionChange = EventDispatcher()
  let onTrackingStateChange = EventDispatcher()

  private var hasLiDAR: Bool {
    ARWorldTrackingConfiguration.supportsFrameSemantics(.smoothedSceneDepth)
  }

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    backgroundColor = .black

    sceneView.automaticallyUpdatesLighting = true
    sceneView.session.delegate = self
    sceneView.rendersContinuously = false
    addSubview(sceneView)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    sceneView.frame = bounds
    interfaceOrientation = window?.windowScene?.interfaceOrientation ?? interfaceOrientation
  }

  deinit {
    sceneView.session.pause()
  }

  // MARK: - Lifecycle

  func setActive(_ value: Bool) {
    guard active != value else { return }
    active = value
    value ? start() : sceneView.session.pause()
  }

  private func start() {
    guard ARWorldTrackingConfiguration.isSupported else {
      onAvailabilityChange(["worldTracking": false, "lidar": false])
      return
    }

    let configuration = ARWorldTrackingConfiguration()

    // Stills are pulled from this session, so prefer the format that ARKit
    // recommends for high-resolution frame capture when one exists.
    if #available(iOS 16.0, *),
       let format = ARWorldTrackingConfiguration.recommendedVideoFormatForHighResolutionFrameCapturing {
      configuration.videoFormat = format
    }

    if hasLiDAR {
      configuration.frameSemantics.insert(.smoothedSceneDepth)
    }

    onAvailabilityChange(["worldTracking": true, "lidar": hasLiDAR])
    sceneView.session.run(
      configuration,
      options: [.resetTracking, .removeExistingAnchors]
    )
  }

  /// Records the current camera pose as the origin for displacement readings.
  func setAnchor() -> Bool {
    guard let frame = sceneView.session.currentFrame else { return false }
    anchorTransform = frame.camera.transform
    smoothedOffset = simd_float3(repeating: 0)
    return true
  }

  func clearAnchor() {
    anchorTransform = nil
    smoothedOffset = simd_float3(repeating: 0)
  }

  // MARK: - Stills

  /// Grabs a full-resolution still. Falls back to the streaming frame on the
  /// rare occasion the high-resolution request cannot be served.
  func capturePhoto(completion: @escaping (Result<URL, Error>) -> Void) {
    guard #available(iOS 16.0, *) else {
      captureStreamingFrame(completion: completion)
      return
    }

    let orientation = currentImageOrientation()

    sceneView.session.captureHighResolutionFrame { [weak self] frame, error in
      guard let self else { return }

      guard let frame else {
        if error != nil {
          self.captureStreamingFrame(completion: completion)
        } else {
          completion(.failure(SpatialCaptureError.captureFailed))
        }
        return
      }

      completion(
        Result { try Self.writeJPEG(frame.capturedImage, orientation: orientation) }
      )
    }
  }

  private func captureStreamingFrame(
    completion: @escaping (Result<URL, Error>) -> Void
  ) {
    guard let frame = sceneView.session.currentFrame else {
      completion(.failure(SpatialCaptureError.noFrame))
      return
    }

    let orientation = currentImageOrientation()
    completion(
      Result { try Self.writeJPEG(frame.capturedImage, orientation: orientation) }
    )
  }

  /// ARKit hands back sensor-native landscape buffers; this maps the current
  /// interface orientation onto the EXIF orientation the file needs.
  private func currentImageOrientation() -> CGImagePropertyOrientation {
    switch interfaceOrientation {
    case .landscapeLeft: return .down
    case .landscapeRight: return .up
    case .portraitUpsideDown: return .left
    default: return .right
    }
  }

  /// The direction, in ARKit camera space, that points to the top of the
  /// screen for the current interface orientation.
  ///
  /// ARKit's camera frame is defined for a landscape-right device: +x runs
  /// along the long edge and +y up the short one. Rotating the device to
  /// portrait therefore puts screen-up along camera +x — which is why reading
  /// `eulerAngles.z` as "roll" reported about 90° whenever the phone was held
  /// upright, and the level check could never pass.
  private var screenAxesInCameraSpace: (up: simd_float3, right: simd_float3) {
    switch interfaceOrientation {
    case .landscapeRight:
      return (simd_float3(0, 1, 0), simd_float3(1, 0, 0))
    case .landscapeLeft:
      return (simd_float3(0, -1, 0), simd_float3(-1, 0, 0))
    case .portraitUpsideDown:
      return (simd_float3(-1, 0, 0), simd_float3(0, 1, 0))
    default:
      return (simd_float3(1, 0, 0), simd_float3(0, -1, 0))
    }
  }

  /// Signed device roll in degrees, zero when the top of the screen points at
  /// world up. Positive means the horizon tilts clockwise on screen.
  private func rollDegrees(for camera: ARCamera) -> Double {
    let t = camera.transform
    let rotation = simd_float3x3(
      simd_make_float3(t.columns.0),
      simd_make_float3(t.columns.1),
      simd_make_float3(t.columns.2)
    )

    let axes = screenAxesInCameraSpace
    let screenUp = simd_normalize(rotation * axes.up)
    let screenRight = simd_normalize(rotation * axes.right)
    let worldUp = simd_float3(0, 1, 0)

    // How far world-up has leaned onto the screen's horizontal axis.
    return Double(atan2(
      simd_dot(worldUp, screenRight),
      simd_dot(worldUp, screenUp)
    )) * 180 / .pi
  }

  private static func writeJPEG(
    _ buffer: CVPixelBuffer,
    orientation: CGImagePropertyOrientation
  ) throws -> URL {
    let image = CIImage(cvPixelBuffer: buffer).oriented(orientation)
    let context = CIContext()

    guard
      let colorSpace = image.colorSpace ?? CGColorSpace(name: CGColorSpace.sRGB)
    else {
      throw SpatialCaptureError.encodeFailed
    }

    guard let data = context.jpegRepresentation(
      of: image,
      colorSpace: colorSpace,
      options: [kCGImageDestinationLossyCompressionQuality as CIImageRepresentationOption: 0.95]
    ) else {
      throw SpatialCaptureError.encodeFailed
    }

    let url = FileManager.default.temporaryDirectory
      .appendingPathComponent("stereo-\(UUID().uuidString).jpg")
    try data.write(to: url, options: .atomic)
    return url
  }

  // MARK: - ARSessionDelegate

  func session(_ session: ARSession, cameraDidChangeTrackingState camera: ARCamera) {
    onTrackingStateChange(["state": Self.describe(camera.trackingState)])
  }

  func session(_ session: ARSession, didFailWithError error: Error) {
    onTrackingStateChange(["state": "failed", "message": error.localizedDescription])
  }

  func session(_ session: ARSession, didUpdate frame: ARFrame) {
    guard active else { return }

    // ~8 Hz is plenty for a human following a distance readout, and keeps the
    // bridge quiet while the session runs at 60 fps.
    let now = CACurrentMediaTime()
    guard now - lastTelemetry > 0.12 else { return }
    lastTelemetry = now

    emitMotion(for: frame)
    emitDistance(for: frame)
  }

  private func emitMotion(for frame: ARFrame) {
    let roll = rollDegrees(for: frame.camera)

    guard let anchorTransform else {
      smoothedOffset = simd_float3(repeating: 0)
      onMotionChange([
        "hasAnchor": false,
        "lateral": 0.0,
        "vertical": 0.0,
        "forward": 0.0,
        "rollDegrees": roll,
        "tracking": Self.describe(frame.camera.trackingState)
      ])
      return
    }

    // Express the current position in the anchor camera's own frame, so
    // "lateral" means sideways relative to how the first shot was aimed —
    // not sideways in some arbitrary world axis.
    let current = frame.camera.transform.columns.3
    let local = simd_mul(simd_inverse(anchorTransform), current)

    // Screen-space axes, so "lateral" still means sideways-on-screen when the
    // phone is held in portrait.
    let axes = screenAxesInCameraSpace
    let localPoint = simd_make_float3(local)
    let raw = simd_float3(
      // `axes.right` is already the screen-right axis for the current
      // interface orientation. Applying another global sign flip made the
      // guidance reverse direction in portrait and landscape.
      simd_dot(localPoint, axes.right),
      simd_dot(localPoint, axes.up),
      -local.z
    )

    // Light exponential smoothing: world tracking jitters by a few millimetres
    // frame to frame, which made the readout twitch at centimetre precision.
    smoothedOffset = smoothedOffset * 0.6 + raw * 0.4

    onMotionChange([
      "hasAnchor": true,
      "lateral": Double(smoothedOffset.x),
      "vertical": Double(smoothedOffset.y),
      // Camera looks down -z, so this is positive toward the subject.
      "forward": Double(smoothedOffset.z),
      "rollDegrees": roll,
      "tracking": Self.describe(frame.camera.trackingState)
    ])
  }

  private func emitDistance(for frame: ARFrame) {
    guard let depth = frame.smoothedSceneDepth ?? frame.sceneDepth else { return }

    let map = depth.depthMap
    CVPixelBufferLockBaseAddress(map, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(map, .readOnly) }

    let width = CVPixelBufferGetWidth(map)
    let height = CVPixelBufferGetHeight(map)
    guard width > 0, height > 0,
          let base = CVPixelBufferGetBaseAddress(map)
    else { return }

    let rowBytes = CVPixelBufferGetBytesPerRow(map)
    let cx = width / 2
    let cy = height / 2

    var samples: [Float] = []
    samples.reserveCapacity(25)

    for y in max(0, cy - 2)...min(height - 1, cy + 2) {
      let row = base.advanced(by: y * rowBytes).assumingMemoryBound(to: Float32.self)
      for x in max(0, cx - 2)...min(width - 1, cx + 2) {
        let value = row[x]
        // ARKit reports 0 for "no return"; clamp to the sensor's usable range.
        if value.isFinite, value > 0.05, value < 100 {
          samples.append(value)
        }
      }
    }

    guard !samples.isEmpty else { return }
    samples.sort()

    onDistanceChange([
      "meters": Double(samples[samples.count / 2]),
      "confidence": Self.confidence(of: depth, atX: cx, y: cy)
    ])
  }

  private static func confidence(
    of depth: ARDepthData,
    atX cx: Int,
    y cy: Int
  ) -> String {
    guard let map = depth.confidenceMap else { return "low" }

    CVPixelBufferLockBaseAddress(map, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(map, .readOnly) }

    guard let base = CVPixelBufferGetBaseAddress(map) else { return "low" }
    let width = CVPixelBufferGetWidth(map)
    let height = CVPixelBufferGetHeight(map)
    let rowBytes = CVPixelBufferGetBytesPerRow(map)

    var best = 0
    for y in max(0, cy - 2)...min(height - 1, cy + 2) {
      let row = base.advanced(by: y * rowBytes).assumingMemoryBound(to: UInt8.self)
      for x in max(0, cx - 2)...min(width - 1, cx + 2) {
        best = max(best, Int(row[x]))
      }
    }

    switch best {
    case 2: return "high"
    case 1: return "medium"
    default: return "low"
    }
  }

  private static func describe(_ state: ARCamera.TrackingState) -> String {
    switch state {
    case .normal: return "normal"
    case .notAvailable: return "unavailable"
    case .limited(let reason):
      switch reason {
      case .initializing: return "initializing"
      case .excessiveMotion: return "excessiveMotion"
      case .insufficientFeatures: return "insufficientFeatures"
      case .relocalizing: return "relocalizing"
      @unknown default: return "limited"
      }
    }
  }
}

enum SpatialCaptureError: LocalizedError {
  case noFrame
  case captureFailed
  case encodeFailed

  var errorDescription: String? {
    switch self {
    case .noFrame: return "The camera has no frame available yet."
    case .captureFailed: return "The photo could not be captured."
    case .encodeFailed: return "The captured frame could not be encoded."
    }
  }
}
