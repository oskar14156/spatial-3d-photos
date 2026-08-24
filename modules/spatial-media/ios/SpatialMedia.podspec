Pod::Spec.new do |s|
  s.name = 'SpatialMedia'
  s.version = '1.0.0'
  s.summary = 'Spatial photo and MV-HEVC processing for Spatial3D.'
  s.description = 'An Expo native module for extracting and exporting stereo media.'
  s.author = 'Spatial3D'
  s.homepage = 'https://github.com/oskar14156/spatial-3d-photos'
  s.platforms = { :ios => '15.1' }
  s.source = { :git => 'https://github.com/oskar14156/spatial-3d-photos.git', :tag => s.version.to_s }
  s.source_files = '**/*.{h,m,mm,swift}'
  # Declared explicitly rather than relying on Swift autolink hints: those get
  # dropped for static-library pods, and a missing framework surfaces only at
  # link time as undefined symbols with no mention of what is actually absent.
  s.frameworks = 'Photos', 'AVFoundation', 'CoreImage', 'CoreMedia',
                 'VideoToolbox', 'ImageIO', 'UIKit'

  s.dependency 'ExpoModulesCore'
end
