var os = require('os');
var cordovaPath = os.platform().indexOf('win') === 0 ? 'node_modules\\cordova\\bin\\' : './node_modules/cordova/bin/';
var pkg = require('./package.json');

module.exports = function (grunt) {

	// load grunt modules
	require('load-grunt-tasks')(grunt);

	/**
	 * define grunt settings
	 */
		
	// signup subdomain
	var signUpSubDomain = grunt.option('signd') || grunt.option('signupsubdomain');
	// subdomain
	var subDomain = grunt.option('subd') || grunt.option('subdomain');
	// superdomain
	var superDomain = grunt.option('superd') || grunt.option('superdomain');
	// version
	var version = grunt.option('build');
	// release
	var release = grunt.option('release') === true ? true : false;

	/**
	 * GRUNT CONFIG
	 */
	grunt.initConfig({

		//use webpack to build the app
		webpack: {
			build: require('./webpack.config.build.js')
		},		

		// clean directories for re-compiling
		clean: {
			test: 'test/*',
			www: 'www/*',
			wwwcss: ['www/css/*.css', 'www/css/*.css.map'],
			platforms: ['platforms/*', 'plugins/*']
		},

		shell: {
			options: {
				stderr: false
			},
			cdvIosPrepare: {
				command: [
					cordovaPath + 'cordova platform add ios &&',
					pkg.app.plugins && pkg.app.plugins.length > 0 ? (cordovaPath + 'cordova plugin add ' + pkg.app.plugins.join(' && ' + cordovaPath + 'cordova plugin add ') + ' &&') : '',
					cordovaPath + 'cordova prepare ios'
				].join(' ')
			},
			cdvAndroidPrepare: {
				command: [
					cordovaPath + 'cordova platform add android &&',
					pkg.app.plugins && pkg.app.plugins.length > 0 ? (cordovaPath + 'cordova plugin add ' + pkg.app.plugins.join(' && ' + cordovaPath + 'cordova plugin add ') + ' &&') : '',
					cordovaPath + 'cordova prepare android'
				].join(' ')
			},
			cdvAndroidBuild: {
				command: cordovaPath + 'cordova compile android ' + (release ? '--release' : '')
			},
			openXcode: {
				command: 'open "platforms/ios/' + pkg.app.name + '.xcodeproj"'
			},
			closeXcode: {
				command: [
					'osascript -e \'tell application "iOS-Simulator" to quit\'',
					'osascript -e \'tell application "Xcode" to quit\''
				].join('&&')
			}
		},

		replace: {
			domain: {
				src: ['src/app/Config.js'],
				overwrite: true, // overwrite matched source files
				replacements: [
					subDomain ? { // adjust server domain
						from: /var subDomain[ ]?=[ ]?["']{1}[.-\wÖÄÜöäü]*["']{1};/g,
						to: 'var subDomain = \'' + subDomain + '\';'
					} : {},
					signUpSubDomain ? { // adjust server domain
						from: /var signUpSubDomain[ ]?=[ ]?["']{1}[.-\wÖÄÜöäü]*["']{1};/g,
						to: 'var signUpSubDomain = \'' + signUpSubDomain + '\';'
					} : {},
					superDomain ? { // adjust server domain
						from: /var superDomain[ ]?=[ ]?["']{1}[.-\wÖÄÜöäü]*["']{1};/g,
						to: 'var superDomain = \'' + superDomain + '\';'
					} : {}
				]
			},
			resetDomain: {
				src: ['src/app/Config.js'],
				overwrite: true, // overwrite matched source files
				replacements: [/*{ // adjust server domain
					from: /var domain[ ]?=[ ]?["']{1}[.-\wÖÄÜöäü]*["']{1};/g,
					to: 'var domain = \'br1.tp-devel.com\';'
				}*/]
			},
			release: {
				src: ['src/app/Config.js'],
				overwrite: true, // overwrite matched source files
				replacements: [
					{ // set release true/false
						from: /release[ ]?:[ ]?[.-\wÖÄÜöäü]*/g,
						to: 'release: ' + release
					}
				]
			},
			resetRelease: {
				src: ['src/app/Config.js'],
				overwrite: true, // overwrite matched source files
				replacements: [
					{ // reset release value
						from: /release[ ]?:[ ]?[.-\wÖÄÜöäü]*/g,
						to: 'release: ' + false
					}
				]
			},
			version: {
				src: ['index.html'],
				overwrite: true, // overwrite matched source files
				replacements: [version ? { // adjust app version
					from: /tppVersion[ ]?=[ ]?["']{1}[.\d]*["']{1}/g,
					to: 'tppVersion = \'' + version + '\''
				} : {}]
			},
			resetVersion: {
				src: ['index.html'],
				overwrite: true, // overwrite matched source files
				replacements: [version ? { // adjust app version
					from: /tppVersion[ ]?=[ ]?["']{1}[.\d]*["']{1}/g,
					to: 'tppVersion = \'0.0.1\''
				} : {}]
			},
			iosInfoPlist: {
				src: ['platforms/ios/' + pkg.app.name + '/' + pkg.app.name + '-Info.plist'],
				overwrite: true, // overwrite matched source files
				replacements: [{ // hide statusbar
					from: '\n  </dict>\n</plist>',
					to: '\n    <key>UIStatusBarHidden</key>\n    <true/>\n    <key>UIViewControllerBasedStatusBarAppearance</key>\n    <false/>\n</dict>\n</plist>'
				}, { // portrait only
					from: '\n      <string>UIInterfaceOrientationLandscapeLeft</string>',
					to: ''
				}, { // portrait only
					from: '\n      <string>UIInterfaceOrientationLandscapeRight</string>',
					to: ''
				}, { // portrait only
					from: '\n      <string>UIInterfaceOrientationPortraitUpsideDown</string>',
					to: ''
				}]
			},
			androidManifest: {
				src: ['platforms/android/androidManifest.xml'],
				overwrite: true,
				replacements: [{ // set debuggable true
					from: '<application',
					to: '<application ' + (release !== true ? 'android:debuggable="true"' : '') //android:debuggable="true"'
				},{	
					from: '<supports-screens android:anyDensity="true" android:largeScreens="true" android:normalScreens="true" android:resizeable="true" android:smallScreens="true" android:xlargeScreens="true" />',
					to: '<supports-screens android:anyDensity="true" android:largeScreens="true" android:normalScreens="false" android:resizeable="true" android:smallScreens="false" android:xlargeScreens="true" />'
				}]
			},
			configXml: {
				src: 'config.xml',
				overwrite: true, // overwrite matched source files
				replacements: [{ // adjust app id
					from: /<widget id="[.\w]*"/g,
					to: '<widget id="' + pkg.app.id + '"'
				}, { // adjust app name
					from: /<name>[\w ]*<\/name>/g,
					to: '<name>' + pkg.app.name + '</name>'
				}, version ? { // adjust version
					from: /version="\d+\.\d+\.\d+"/g,
					to: 'version="' + version + '"'
				} : {}]
			},
			configXmlIOSCodebId: { // app id for ios has to contain "com.codeb." to work with our testing provisioning profile. do not run this task for distribution!!
				src: 'config.xml',
				overwrite: true, // overwrite matched source files
				replacements: [{ // adjust app id
					from: /<widget id="[.\w]*"/g,
					to: '<widget id="com.codeb.' + pkg.app.name.replace(' ','') + '"' 
				}]
			},
			resetConfigXml: {
				src: 'config.xml',
				overwrite: true, // overwrite matched source files
				replacements: [{ // reset app id adjustments
					from: /<widget id="[.\w]*"/g,
					to: '<widget id="com.codeb.voila"'
				}, { // reset app name adjustments
					from: /<name>[\w ]*<\/name>/g,
					to: '<name>Touchpoint</name>'
				}, { // reset version adjustment
					from: /version="\d+\.\d+\.\d+"/g,
					to: 'version="0.0.1"'
				}]
			},
			androidStrings: {
				src: 'platforms/android/res/values/strings.xml',
				overwrite: true, // overwrite matched source files
				replacements: [{ // adjust app name
					from: '<string name="app_name">Voila</string>',
					to: '<string name="app_name">' + pkg.app.name + '</string>'
				}]
			}
		}
	});

	// Show current settings
	grunt.registerTask('logSettings', 'Echos settings to console', function () {
		grunt.log.subhead('Settings:');
		grunt.log.writeln('-----------------------');

		grunt.log[subDomain ? 'ok' : 'error']('SubDomain: ' + (subDomain ? subDomain : '-subd param not defined'));
		grunt.log[signUpSubDomain ? 'ok' : 'error']('SignUpSubDomain: ' + (signUpSubDomain ? signUpSubDomain : '-signd param not defined'));
		grunt.log[superDomain ? 'ok' : 'error']('SuperDomain: ' + (superDomain ? superDomain : '-superd param not defined'));

		grunt.log.ok('Version: ' + version);
		grunt.log.ok('Release: ' + (release));
		grunt.log.writeln('-----------------------');
	});

	// registering build tasks
	// webpack
	grunt.registerTask('build', ['clean:www', 'config', 'webpack:build', 'reset-config']);
	// config
	grunt.registerTask('config', ['logSettings', 'replace:version', 'replace:domain', 'replace:release']);
	grunt.registerTask('reset-config', ['replace:resetVersion', 'replace:resetDomain', 'replace:resetConfigXml', 'replace:resetRelease']);
	// iOS
	grunt.registerTask('ios', ['logSettings', 'build', 'shell:closeXcode', 'build-ios', 'shell:openXcode']);
	grunt.registerTask('build-ios', ['clean:platforms', 'replace:configXml', 'replace:configXmlIOSCodebId', 'shell:cdvIosPrepare', 'replace:iosInfoPlist', 'reset-config']);
	grunt.registerTask('ios-jenkins', ['logSettings', 'build', 'build-ios']);
	// Android
	grunt.registerTask('android', ['logSettings', 'clean:platforms', 'build', 'build-android']);
	grunt.registerTask('build-android', ['replace:configXml', 'shell:cdvAndroidPrepare', 'replace:androidStrings', 'replace:androidManifest', 'shell:cdvAndroidBuild', 'reset-config']);
};
