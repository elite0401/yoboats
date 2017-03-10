stripe = Npm.require('stripe')(Meteor.settings.stripe.secretKey);

var resources = {
	charges: ['create', 'retrieve', 'update', 'capture', 'list'],
	plans: ['create', 'retrieve', 'update', 'del', 'list'],
	customers: ['create', 'update', 'createSource', 'listCards', 'deleteCard', 'listSubscriptions', 'updateSubscription', 'cancelSubscription', 'retrieve'],
	events: ['retrieve']
};

_.each(resources, function(resource, key) {
	_.each(resource, function(funcName) {
		var func = stripe[key][funcName];

		stripe[key][funcName] = Meteor.wrapAsync(func, stripe[key]);
	});
})
