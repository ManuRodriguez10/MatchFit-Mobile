const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

// Recent Xcode (seen on 27.2) rejects pod targets whose iOS deployment target is below 15.0.
// Some pods (e.g. AsyncStorage's privacy-manifest resource bundle) still declare 13.4,
// so raise every pod target to Expo SDK 54's minimum after `pod install`.
const MIN_IOS = '15.1';
const MARKER = '# withMinimumPodDeploymentTarget';

const snippet = `
    ${MARKER}
    installer.pods_project.targets.each do |t|
      t.build_configurations.each do |c|
        current = c.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current.nil? || Gem::Version.new(current) < Gem::Version.new('${MIN_IOS}')
          c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN_IOS}'
        end
      end
    end
`;

module.exports = function withMinimumPodDeploymentTarget(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfile, 'utf8');
      if (!contents.includes(MARKER)) {
        contents = contents.replace(/post_install do \|installer\|\n/, (m) => m + snippet);
        fs.writeFileSync(podfile, contents);
      }
      return cfg;
    },
  ]);
};
