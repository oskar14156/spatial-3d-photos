Pod::Spec.new do |s|
  s.name = 'SpatialCapture'
  s.version = '1.0.0'
  s.summary = 'ARKit stereo capture surface for Spatial3D.'
  s.description = 'An Expo native module providing the ARKit viewfinder used for Cha-Cha stereo capture: LiDAR subject distance, world-tracked lateral displacement, and high-resolution stills.'
  s.author = 'Spatial3D'
  s.homepage = 'https://github.com/oskar14156/spatial-3d-photos'
  s.platforms = { :ios => '15.1' }
  s.source = { :git => 'https://github.com/oskar14156/spatial-3d-photos.git', :tag => s.version.to_s }
  s.source_files = '**/*.{h,m,mm,swift}'
  s.dependency 'ExpoModulesCore'
end
