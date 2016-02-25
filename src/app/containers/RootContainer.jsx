import React from 'react';

export default class RootContainer extends React.Component {
	render() {
		return (
			<section className="root">
				{this.props.children}
			</section>
		);
	}
}

RootContainer.displayName = 'RootContainer';

RootContainer.propTypes = {
	children: React.PropTypes.oneOfType([
			React.PropTypes.arrayOf(React.PropTypes.element),
			React.PropTypes.element
		])
};