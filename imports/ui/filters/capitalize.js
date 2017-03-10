import angular from 'angular';

const name = 'filters.capitalize';

export default name;

angular.module(name, [])
.filter('capitalize', () => {
	return (input, scope) => {
		if(input==null) {
			return input;
		}

		input = input.toLowerCase();
		return input.substring(0,1).toUpperCase() + input.substring(1);
	};
});
