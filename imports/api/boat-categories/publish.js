import {Meteor} from 'meteor/meteor';

import {BoatCategories} from './collection';

if(Meteor.isServer) {
	Meteor.publish('boat-categories', function() {
		return BoatCategories.find();
	});
}
