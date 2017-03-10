import {Mongo} from 'meteor/mongo';
import {Roles} from 'meteor/alanning:roles';

export const SocialNetworks = new Mongo.Collection('socialnetworks');

SocialNetworks.allow({
	update(userId, doc) {
		return Roles.userIsInRole(Meteor.userId(), 'admin');
	}
});
