/* global anywherecommercecardreader */

import React from 'react';
import i18next from 'i18next';

import styles from '../styles/page.scss';

class HomeContainer extends React.Component {

	constructor(props) {
	    super(props);
	    this.state = {
	    	settingsRetrieved: false,
	    	message: null,
	    	error: null,
	    	deviceError: null,
	    	saleResponse: null,
	    	testCase: null,
	    };
	  }


	componentDidMount() {

		anywherecommercecardreader.addListener(this.onSettingsRetrieved.bind(this), 'onSettingsRetrieved');
		anywherecommercecardreader.addListener(this.displayMessage.bind(this),'onMessage');
		anywherecommercecardreader.addListener(this.displayError.bind(this),'onError');
		anywherecommercecardreader.addListener(this.displayDeviceError.bind(this),'onDeviceError');
		anywherecommercecardreader.addListener(this.sendSignature.bind(this),'onSignatureRequired');


		anywherecommercecardreader.addListener(this.displaySaleResponse.bind(this), 'onSaleResponse');

		if(window.anywherecommercecardreader){
			//anywherecommercecardreader.init(null, '1002', 'password', true); //for tests against the debug server
			anywherecommercecardreader.init(null, '1002', 'password', true, true); //for the verification tests 
		}	
	}

	onSettingsRetrieved() {
		this.setState({
			settingsRetrieved: true
		});
	}

	displayMessage(res) {
		this.setState({
			message: res.name
		});
	}

	displayError(res) {
		this.setState({
			error: res.name
		});
	}

	displayDeviceError(res) {
		this.setState({
			deviceError: res.name
		});
	}

	displaySaleResponse(res) {
		this.setState({
			saleResponse: res.json
		});
	}

	runTestcase(testCase) {
		this.setState({
			message: null,
	    	error: null,
	    	deviceError: null,
	    	saleResponse: null,
	    	testCase: testCase,
		});
		anywherecommercecardreader.doSelfTest(null, testCase);
	}

	validateTests() {
		anywherecommercecardreader.validateSelfTest();
	}

	/**
	 * send some random signature
	 */
	sendSignature() {
		anywherecommercecardreader.signitureStartTouch(10,10);
		anywherecommercecardreader.signitureMoveTouch(15,15);
		anywherecommercecardreader.signitureUpTouch();
		anywherecommercecardreader.signitureSubmit();
	} 


	render() {
		return (
			<div className="page">
				<div style={{paddingBottom: '20px'}}>{this.state.settingsRetrieved ? 'teminal logged in' :  'teminal NOT logged in'}</div>

				<div style={{paddingBottom: '20px'}}>Current Test Case: {this.state.testCase}</div>

				<div>Last Message: {this.state.message}</div>
				<div>Last Error: {this.state.error}</div>
				<div style={{paddingBottom: '40px'}}>Last DeviceError: {this.state.deviceError}</div>

				<div style={{overflowWrap: 'break-word', paddingBottom: '40px'}}>Last SaleResponse: {this.state.saleResponse}</div>
				{
					this.state.settingsRetrieved &&
					(
						<div>
							<button onClick={() => this.runTestcase('TRACK_APPROVAL_SERVER')} >Press to run TRACK_APPROVAL_SERVER testcase</button>
							<button onClick={() => this.runTestcase('TRACK_DECLINED_SERVER')} >Press to run TRACK_DECLINED_SERVER testcase</button>
							<button onClick={() => this.runTestcase('TRACK_DEVICE_SWIPE_FAILED')} >Press to run TRACK_DEVICE_SWIPE_FAILED testcase</button>
							<button onClick={() => this.runTestcase('TRACK_DEVICE_DECLINED_ERROR')} >Press to run TRACK_DEVICE_DECLINED_ERROR testcase</button>
							<button onClick={() => this.runTestcase('TRACK_DEVICE_TIMEOUT')} >Press to run TRACK_DEVICE_TIMEOUT testcase</button>
							<button onClick={() => this.runTestcase('TRACK_DEVICE_INTERRUPTED')} >Press to run TRACK_DEVICE_INTERRUPTED testcase</button>
							<button onClick={() => this.runTestcase('TRACK_TRANSACTION_ERROR')} >Press to run TRACK_TRANSACTION_ERROR testcase</button>
							<button onClick={() => this.runTestcase('EMV_SIG_APPROVAL_SERVER')} >Press to run EMV_SIG_APPROVAL_SERVER testcase</button>
							<button onClick={() => this.runTestcase('EMV_DECLINED_SERVER')} >Press to run EMV_DECLINED_SERVER testcase</button>
							<button onClick={() => this.runTestcase('EMV_TRANSACTION_ERROR')} >Press to run EMV_TRANSACTION_ERROR testcase</button>
							<button onClick={() => this.runTestcase('EMV_DEVICE_INVALID_CARD')} >Press to run EMV_DEVICE_INVALID_CARD testcase</button>
							<button onClick={() => this.runTestcase('EMV_DEVICE_DECLINED_ERROR')} >Press to run EMV_DEVICE_DECLINED_ERROR testcase</button>
							<button onClick={() => this.runTestcase('EMV_DEVICE_TIMEOUT')} >Press to run EMV_DEVICE_TIMEOUT testcase</button>
							<button onClick={() => this.runTestcase('EMV_DEVICE_INTERRUPTED')} >Press to run EMV_DEVICE_INTERRUPTED testcase</button>
							<button onClick={() => this.validateTests()} >Press to vildate tests</button>
						</div>
					)
				}
			</div>
		);
	}
}
HomeContainer.displayName = 'HomeContainer';
export default HomeContainer;
