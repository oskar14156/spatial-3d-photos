package expo.modules.spatialcapture

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Mirrors the iOS SpatialCapture surface exactly, so the JavaScript side has
 * no platform branches: same view name, same props, same events, same
 * functions. Only the tracking engine underneath differs (ARCore, not ARKit).
 */
class SpatialCaptureModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SpatialCapture")

    View(SpatialCaptureView::class) {
      Events(
        "onDistanceChange",
        "onAvailabilityChange",
        "onMotionChange",
        "onTrackingStateChange"
      )

      Prop("active") { view: SpatialCaptureView, active: Boolean ->
        view.setActive(active)
      }

      /** Records the current pose as the zero point for displacement. */
      AsyncFunction("setAnchor") { view: SpatialCaptureView ->
        view.setAnchor()
      }

      AsyncFunction("clearAnchor") { view: SpatialCaptureView ->
        view.clearAnchor()
      }

      /** Resolves with a `file://` URI for a JPEG still. */
      AsyncFunction("capturePhoto") { view: SpatialCaptureView, promise: expo.modules.kotlin.Promise ->
        view.capturePhoto { result ->
          result
            .onSuccess { promise.resolve(it) }
            .onFailure {
              promise.reject(
                "ERR_SPATIAL_CAPTURE",
                it.message ?: "Capture failed.",
                it
              )
            }
        }
      }

      OnViewDestroys { view: SpatialCaptureView ->
        view.release()
      }
    }
  }
}
