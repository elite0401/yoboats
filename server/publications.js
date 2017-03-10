import {Meteor} from 'meteor/meteor';
import {Counts} from 'meteor/ros:publish-counts';
import {Roles} from 'meteor/alanning:roles';
import {check} from 'meteor/check';

import {AdFormFields} from '../imports/api/ad-form-fields';
import {BoatCategories} from '../imports/api/boat-categories';
import {FacebookAds} from '../imports/api/facebook-ads';
import {Listings} from '../imports/api/listings';
import {Plans} from '../imports/api/plans';
import {SocialNetworks} from '../imports/api/social-networks';
import {checkUser} from '../imports/api/user-utils';

Meteor.publish('landing', function() {
	Counts.publish(this, 'pleasure', Listings.find({boatCategory: "Pleasure"}));
	Counts.publish(this, 'commercial', Listings.find({boatCategory: "Commercial"}));
	this.ready();
});

Meteor.publish('user', function(){
	Counts.publish(this, 'my-listings', Listings.find({userId: this.userId}));
	this.ready();
});

Meteor.publish('admin', function(){
	if (Roles.userIsInRole(this.userId, 'admin')){
		Counts.publish(this, 'listings', Listings.find());
		Counts.publish(this, 'users', Meteor.users.find());
	}
	this.ready();
});

Meteor.publish('listings', function(ids) {
	if (!Array.isArray(ids)) {
		ids = [ids];
	};
	
	check(ids, [String]);
	
	var query = {$or: [
		{_id: {$in: ids}, published: true},
		{_id: {$in: ids}, userId: this.userId}
	]};

	return Listings.find(query);
});

Meteor.publish('listings-admin', function(ids) {
	if (!Array.isArray(ids)) {
		ids = [ids];
	};

	check(ids, [String]);

	if(Roles.userIsInRole(this.userId, 'admin')) {
		return Listings.find({_id: {$in: ids}});
	}

	this.ready();
});

Meteor.publish('users', function(options) {
	if (Roles.userIsInRole(this.userId, 'admin')) {
		return Meteor.users.find({}, options);
	}
	this.ready();
});

Meteor.publish('facebook-ads', function() {
	checkUser(this.userId, 'admin');

	return FacebookAds.find();
});
