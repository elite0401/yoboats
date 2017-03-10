Npm.depends({
  "stripe": "4.1.0"
});

Package.onUse(function(api){
	api.use("underscore", "server");
	api.addFiles('stripeInstance.js', "server");
	api.export("stripe", "server");
});