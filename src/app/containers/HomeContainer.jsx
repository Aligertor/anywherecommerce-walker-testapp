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
	    };
	  }


	componentDidMount() {

		anywherecommercecardreader.addListener(this.onSettingsRetrieved.bind(this), 'onSettingsRetrieved');
		anywherecommercecardreader.addListener(this.displayMessage.bind(this),'onMessage');
		anywherecommercecardreader.addListener(this.displayError.bind(this),'onError');
		anywherecommercecardreader.addListener(this.displayDeviceError.bind(this),'onDeviceError');

		if(window.anywherecommercecardreader){
			anywherecommercecardreader.init(null, '1002', 'password', true);
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

	render() {
		return (
			<div className="page">
				<div>{this.state.settingsRetrieved ? 'teminal logged in' :  'teminal logged not'}</div>
				<div>Last Message: {this.state.message}</div>
				<div>Last Error: {this.state.error}</div>
				<div>Last DeviceError: {this.state.deviceError}</div>
			</div>
		);
	}
}
HomeContainer.displayName = 'HomeContainer';
export default HomeContainer;
