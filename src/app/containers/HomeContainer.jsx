/* global anywherecommercecardreader */

import React from 'react';
import i18next from 'i18next';

import styles from '../styles/page.scss';

class HomeContainer extends React.Component {

	constructor(props) {
	    super(props);
	    this.state = {
	    	settingsRetrieved: false
	    };
	  }


	componentDidMount() {

		anywherecommercecardreader.addListener(this.onSettingsRetrieved, 'onSettingsRetrieved');

		if(window.anywherecommercecardreader){
			anywherecommercecardreader.initReader('1002', 'secretpass', true);
		}	
	}

	onSettingsRetrieved() {
		this.setState({
			settingsRetrieved: true
		});
	}

	render() {
		return (
			<div className="page">
				{this.state.settingsRetrieved && <div>Terminal connected</div>}
			</div>
		);
	}
}
HomeContainer.displayName = 'HomeContainer';
export default HomeContainer;
