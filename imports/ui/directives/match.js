import angular from 'angular';

const name = 'directives.match';

export default name;

angular.module(name, [])
.filter('match', $parse => {
	'ngInject';

	return {
		require: '?ngModel',
		restrict: 'A',
		link(scope, elem, attrs, ctrl) {
			if(!ctrl) {
				if(console && console.warn) {
					console.warn('match validation requires ngModel to be on the element');
				}
				return;
			}

			const matchGetter = $parse(attrs.match);

			scope.$watch(getMatchValue, () => {
				ctrl.$$parseAndValidate();
			});

			ctrl.$validators.match = function() {
				return ctrl.$viewValue === getMatchValue();
			};

			function getMatchValue() {
				var match = matchGetter(scope);

				if(angular.isObject(match) && match.hasOwnProperty('$viewValue')) {
					match = match.$viewValue;
				}

				return match;
			}
		}
	};
});
