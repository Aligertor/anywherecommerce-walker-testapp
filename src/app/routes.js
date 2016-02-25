import React from 'react';
import {Route, Redirect} from 'react-router';

//containers
import RootContainer from './containers/RootContainer.jsx';
import HomeContainer from './containers/HomeContainer.jsx';

export default (
	<Route name="app" component={RootContainer}>
		<Route path="/" component={HomeContainer} />
		
	</Route>
);
