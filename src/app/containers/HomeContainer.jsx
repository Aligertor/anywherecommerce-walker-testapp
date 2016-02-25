import React from 'react';
import i18next from 'i18next';

import styles from '../styles/page.scss';

class HomeContainer extends React.Component {
	render() {
		return (
			<div className="page">{i18next.t('hello_home')}</div>
		);
	}
}
HomeContainer.displayName = 'HomeContainer';
export default HomeContainer;
