import React from 'react';

class DumbComponent extends React.Component {
	render() {
		return (
			<div>{this.props.children}</div>
		);
	}
}

DumbComponent.displayName = 'DumbComponent';
DumbComponent.propTypes = {
	children: React.PropTypes.oneOfType([
			React.PropTypes.arrayOf(React.PropTypes.element),
			React.PropTypes.element
		])
};
export default DumbComponent;