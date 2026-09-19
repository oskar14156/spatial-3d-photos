const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Forces every generated pod target up to the project's deployment target.
 *
 * `expo-build-properties` sets the target for the pods themselves, but not for
 * the resource-bundle targets CocoaPods synthesises alongside them. Those keep
 * whatever their podspec declared — SDWebImage still says iOS 9 — and Xcode
 * now refuses to build a target below iOS 15 outright rather than warning.
 *
 * This has to be a plugin rather than a hand-edited Podfile: `ios/` is
 * generated and not tracked, so any direct edit is lost on the next prebuild.
 */
module.exports = function withPodDeploymentTarget(config, { deploymentTarget }) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      const source = fs.readFileSync(podfile, 'utf8');
      const anchor = 'post_install do |installer|';

      if (!source.includes(anchor)) {
        throw new Error(
          'withPodDeploymentTarget: no post_install block found in the Podfile.'
        );
      }
      if (source.includes('withPodDeploymentTarget')) return cfg;

      const patch = `${anchor}
    # withPodDeploymentTarget: raise every pod target, including the resource
    # bundles CocoaPods generates, to the app's own minimum.
    installer.pods_project.targets.each do |t|
      t.build_configurations.each do |bc|
        current = bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f
        if current < ${deploymentTarget}
          bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${deploymentTarget}'
        end
      end
    end`;

      fs.writeFileSync(podfile, source.replace(anchor, patch));
      return cfg;
    },
  ]);
};
