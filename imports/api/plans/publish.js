import {Meteor} from 'meteor/meteor';
import {Roles} from 'meteor/alanning:roles';

import {Plans} from './collection';

if(Meteor.isServer) {
	Meteor.publish('plans', function() {
		if(Roles.userIsInRole(this.userId, 'admin')) {
			return Plans.find();
		}

		return Plans.find({active: true, public: true});
	});
}
