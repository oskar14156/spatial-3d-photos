const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

/**
 * Adopts the UIKit scene life cycle.
 *
 * Apps linked against the iOS 26 SDK and later must adopt it; UIKit traps at
 * launch otherwise, with "UIScene life cycle is required for apps built with
 * this SDK", which reaches the user as an instant crash and no message. Expo
 * SDK 54 still ships the pre-scene AppDelegate — ExpoAppDelegate.swift carries
 * a TODO where the scene hooks would go — so the app has to bring its own.
 *
 * The scene delegate lives inside AppDelegate.swift rather than its own file
 * so the plugin never has to add a source file to the Xcode project. ios/ is
 * generated, so this cannot be a hand edit.
 *
 * Remove this once Expo adopts the scene life cycle itself; two scene
 * delegates would fight over the window.
 */

const SCENE_DELEGATE = `
/// Owns the window under the scene life cycle.
///
/// React Native used to be started from \`didFinishLaunchingWithOptions\` with a
/// window built from \`UIScreen.main.bounds\`. Under scenes the window must come
/// from the UIWindowScene UIKit hands us, and it does not exist yet when the
/// app delegate runs — so startup is split: the app delegate builds the React
/// Native factory, and this starts it once there is a scene to draw into.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    (UIApplication.shared.delegate as? AppDelegate)?.startReactNative(in: window)

    // A launch that came from a link arrives here rather than through the app
    // delegate, which scenes no longer call for this.
    for context in connectionOptions.urlContexts {
      RCTLinkingManager.application(UIApplication.shared, open: context.url, options: [:])
    }
    for activity in connectionOptions.userActivities {
      RCTLinkingManager.application(UIApplication.shared, continue: activity) { _ in }
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      RCTLinkingManager.application(UIApplication.shared, open: context.url, options: [:])
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    RCTLinkingManager.application(UIApplication.shared, continue: userActivity) { _ in }
  }
}
`;

function patchAppDelegate(contents) {
  const windowSetup = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif`;

  if (contents.includes('class SceneDelegate')) return contents;
  if (!contents.includes(windowSetup)) {
    throw new Error(
      'withSceneLifecycle: the Expo AppDelegate template changed. Re-check the ' +
        'window setup before trusting this plugin.'
    );
  }

  // The scene, not the app delegate, decides when there is something to draw
  // into. Hold the launch options until then.
  contents = contents.replace(
    windowSetup,
    `    self.launchOptions = launchOptions`
  );

  contents = contents.replace(
    '  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?',
    `  var launchOptions: [UIApplication.LaunchOptionsKey: Any]?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?`
  );

  // Called by the scene delegate once UIKit has given us a window scene.
  contents = contents.replace(
    '  // Linking API',
    `  func startReactNative(in window: UIWindow) {
    self.window = window
    reactNativeFactory?.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
  }

  // Linking API`
  );

  return `${contents.trimEnd()}\n${SCENE_DELEGATE}`;
}

module.exports = function withSceneLifecycle(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return cfg;
  });

  return withAppDelegate(config, (cfg) => {
    cfg.modResults.contents = patchAppDelegate(cfg.modResults.contents);
    return cfg;
  });
};
