import {Meteor} from 'meteor/meteor';
import {Manufacturers} from './collection';

if(Meteor.isServer) {
	Meteor.methods({
		'manufacturers.search'(name) {
			return Manufacturers.find({name: {$regex: name + '.*', $options: 'i'}}, {limit: 5}).fetch();
		},
		'manufacturers.list'() {
			return Manufacturers.find({}, {sort: {name: 1}}).fetch();
		}
	});
}
