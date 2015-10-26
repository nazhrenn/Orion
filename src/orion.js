
var engine = require('./engine');
var component = require('./component');

module.exports = (function () {
	return {
		Engine: engine,
		Component: component
	}
}());
