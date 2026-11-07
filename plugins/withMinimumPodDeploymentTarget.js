const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

// Recent Xcode (seen on 27.2) rejects pod targets whose iOS deployment target is below 15.0.
// Some pods (e.g. AsyncStorage's privacy-manifest resource bundle) still declare 13.4,
// so raise every pod target to Expo SDK 54's minimum after `pod install`.
const MIN_IOS = '15.1';
const MARKER = '# withMinimumPodDeploymentTarget';
const POST_INSTALL = /post_install do \|(\w+)\|\r?\n/;

// Values like "$(inherited)" are left alone; only plain version numbers are compared.
const snippet = (installer) => `
    ${MARKER}
    ${installer}.pods_project.targets.each do |t|
      t.build_configurations.each do |c|
        current = c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_s
        next unless current.empty? || current.match?(/\\A\\d+(\\.\\d+)*\\z/)
        if current.empty? || Gem::Version.new(current) < Gem::Version.new('${MIN_IOS}')
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
      const contents = fs.readFileSync(podfile, 'utf8');
      if (contents.includes(MARKER)) return cfg;

      const match = contents.match(POST_INSTALL);
      if (!match) {
        throw new Error(
          `withMinimumPodDeploymentTarget: no "post_install do |installer|" block found in ${podfile}. ` +
            'The Expo Podfile template may have changed; update the plugin.'
        );
      }
      fs.writeFileSync(podfile, contents.replace(POST_INSTALL, (m) => m + snippet(match[1])));
      return cfg;
    },
  ]);
};
