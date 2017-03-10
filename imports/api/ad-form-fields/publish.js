import {Meteor} from 'meteor/meteor';

import {AdFormFields} from './collection';

if(Meteor.isServer) {
	Meteor.publish('ad-form-fields', function() {
		return AdFormFields.find();
	});
}
