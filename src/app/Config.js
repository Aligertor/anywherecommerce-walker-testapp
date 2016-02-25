// these variables can be set via grunt 
var subDomain = 'ch2';
var signUpSubDomain = 'c1';
var superDomain = 'tp-devel.com';

//@TODO cnange grunt to configure this more properly
//in grunt u should be able to set the signUpDomainSubdomain (here 'c1') and the superDomain (here 'tp-devel.com') so the signup domain can be composed as c1.tp-devel.com and also the app domain
//still the old stuff has to work for the bill

var Config = {

	/**
	 * 
	 */
	superDomain: superDomain,
	/**
	 * Domain for the sqib calls
	 */
	serverDomain: (subDomain + '.' + superDomain),
	/**
	 * Url for the squib calls during the signup process (used in the qsrc)
	 */
	signUpServerUrl: 'http://' + (!(signUpSubDomain && superDomain) ? '' : (signUpSubDomain + '.' + superDomain + '/') ),
	/**
	 * Url for the squib calls
	 */
	serverUrl: 'http://' + (!(subDomain && superDomain) ? '' : (subDomain + '.' + superDomain) + '/'),

	/**
	 * Url for the update process
	 */
	updateUrl: 'http://' + signUpSubDomain + '.' + superDomain,

	/**
	 * App uses the mocked API if set to true
	 */
	mockedApi: false,
	/**
	 * App version. Do not change here. Handled via grunt
	 */
	version: '0.2.1',
	/**
	 * AppId. Do not change here. Handled in package.json
	 */
	appId: '',
	/**
	 * Server ID: used for live updates
	 */
	serverId: 'com.tpp.loyalty',

	/**
	 * indicates if in production mode
	 * @type {Boolean}
	 */
	release: false,

	squeezeFactor: 1
};

module.exports = Config;