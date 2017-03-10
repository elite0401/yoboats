FacebookAds = function(graph, adAccountId) {
	if(!(graph instanceof FacebookGraph)) {
		graph = new FacebookGraph(data);
	}

	this.graph = graph;
	this.adAccountId = 'act_' + adAccountId;
};

FacebookAds.prototype.getSavedAudiences = function() {
	var response = this.graph.get([this.adAccountId, 'saved_audiences'], {fields: 'name,approximate_count,description,sentence_lines,targeting,time_created,time_updated'});
};

FacebookAds.prototype.getCustomAudiences = function() {
	var response = this.graph.get([this.adAccountId, 'customaudiences']);

	return response.statusCode===200? response.data.data : false;
};

FacebookAds.prototype.postCustomAudience = function(data) {

};
