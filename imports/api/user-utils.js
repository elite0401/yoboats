import {Meteor} from 'meteor/meteor';
import {Roles} from 'meteor/alanning:roles';

export const checkUser = function(userId, roles) {
	if(!userId) {
		throw new Meteor.Error(401, 'Authentication required');
	}

	if(!Roles.userIsInRole(userId, 'admin')) {
		throw new Meteor.Error(403, 'Forbidden');
	}
}

export const getUserEmail = function(user) {
	if(user.emails && _.isArray(user.emails) && user.emails.length>0) {
		return user.emails[0].address;
	}

	if(user.services) {
		if(user.services.facebook) {
			return user.services.facebook.email;
		}
	}

	return null;
};
