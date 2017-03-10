import {Meteor} from 'meteor/meteor';

import {SocialNetworks} from './collection';

if(Meteor.isServer) {
	Meteor.publish('social-networks', function() {
		return SocialNetworks.find();
	});
}
