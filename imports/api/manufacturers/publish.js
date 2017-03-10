import {Meteor} from 'meteor/meteor';

import {Manufacturers} from './collection';

if(Meteor.isServer) {
	Meteor.publish('manufacturers', function() {
		return Manufacturers.find();
	});
}
