import angular from 'angular';

const name = 'stripe';

export default name;

angular.module(name, [])
.directive('stripeForm', $window => {
	'ngInject';

	return {
		restrict: 'A',
		link(scope, element, attributes) {
			const form = angular.element(element);

			form.bind('submit', () => {
				const button = form.find('button');
				button.prop('disabled', true);

				$window.Stripe.createToken(form[0], (...args) => {
					button.prop('disabled', false);
					scope.$eval(attributes.stripeForm).apply(scope, args);
				});
			});
		}
	};
});
