import ExpoModulesCore

public class SpatialCaptureModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SpatialCapture")

    View(SpatialCaptureView.self) {
      Events(
        "onDistanceChange",
        "onAvailabilityChange",
        "onMotionChange",
        "onTrackingStateChange"
      )

      Prop("active") { (view: SpatialCaptureView, active: Bool) in
        view.setActive(active)
      }

      /// Records the current pose as the zero point for displacement.
      AsyncFunction("setAnchor") { (view: SpatialCaptureView) -> Bool in
        view.setAnchor()
      }

      AsyncFunction("clearAnchor") { (view: SpatialCaptureView) in
        view.clearAnchor()
      }

      /// Resolves with a `file://` URI for a full-resolution JPEG still.
      AsyncFunction("capturePhoto") { (view: SpatialCaptureView, promise: Promise) in
        view.capturePhoto { result in
          switch result {
          case .success(let url):
            promise.resolve(url.absoluteString)
          case .failure(let error):
            promise.reject("ERR_SPATIAL_CAPTURE", error.localizedDescription)
          }
        }
      }
    }
  }
}
