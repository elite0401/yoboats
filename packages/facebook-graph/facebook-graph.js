FacebookGraph = function(data) {
	this.version = data && data.version || 'v2.6';
	this.baseUrl = data && data.baseUrl || 'https://graph.facebook.com';
	this.accessToken = data && data.accessToken || null;
};

FacebookGraph.prototype._getEdgePath = function(edge) {
	var edgeArray = _.isArray(edge) ? _.clone(edge) : [edge];

	edgeArray.unshift(this.baseUrl, this.version);

	return edgeArray.join('/');
};

FacebookGraph.prototype._call = function(method, edge, params) {
	var edgePath = this._getEdgePath(edge);

	return HTTP.call(method, edgePath, {
		params: params
	});
};

FacebookGraph.prototype._getAccessToken = function(id, impersonate) {
	if(!impersonate) {
		return this.accessToken;
	}

	var response = this.get(id, {
		fields: 'access_token',
		access_token: this.accessToken
	});

	return response.statusCode===200? response.data.access_token : false;
};

FacebookGraph.prototype.get = function(edge, params) {
	if(!params.access_token && this.accessToken) {
		params.access_token = this.accessToken;
	}

	return this._call('GET', edge, params);
};

FacebookGraph.prototype.post = function(edge, params) {
	if(!params.access_token && this.accessToken) {
		params.access_token = this.accessToken;
	}

	return this._call('POST', edge, params);
};

FacebookGraph.prototype.getFeed = function(id) {
	var response = this.get([id, 'feed'], {redirect: false});

	return response.statusCode===200? response.data.data : false;
};

FacebookGraph.prototype.postFeed = function(id, data, impersonate) {
	var accessToken = this._getAccessToken(id, impersonate),
		response = this.post([id, 'feed'], _.extend(data, {access_token: accessToken}));


	if(response.statusCode!==200) {
		throw new Meteor.Error(response.statusCode, response.data);
	}

	return response.data;
};

FacebookGraph.prototype.postPhoto = function(id, data, impersonate) {
	var accessToken = this._getAccessToken(id, impersonate),
		response = this.post([id, 'photos'], _.extend(data, {access_token: accessToken}));

	if(response.statusCode===200) {
		return response.data.id;
	}

	throw new Meteor.Error(response.data);
};

FacebookGraph.prototype.postAlbum = function(id, data, impersonate) {
	var accessToken = this._getAccessToken(id, impersonate),
		response = this.post([id, 'albums'], _.extend(data, {access_token: accessToken}));

	if(response.statusCode===200) {
		return response.data.id;
	}

	throw new Meteor.Error(response.data);
};

FacebookGraph.prototype.postTag = function(id, data, impersonate) {
	var accessToken = this._getAccessToken(id, impersonate),
		response = this.post([id, 'tags'], _.extend(data, {access_token: accessToken}));

	return response.statusCode===200? true : response.data;
};
