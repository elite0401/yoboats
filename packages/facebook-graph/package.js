Package.onUse(function(api) {
	api.use(['underscore', 'http', 'service-configuration'], 'server');
	api.addFiles('facebook-graph.js', 'server');
	api.export(['FacebookGraph'], 'server');
});
