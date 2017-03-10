import {Mongo} from 'meteor/mongo';
import {Roles} from 'meteor/alanning:roles';
import {SimpleSchema} from 'meteor/aldeed:simple-schema';
import {check} from 'meteor/check';

import {Manufacturers} from '../manufacturers';
import {AdFormSchema} from '../ad-form-schema';

export const Listings = new Mongo.Collection('listings');

if(Meteor.isServer) {
	Listings.before.insert((userId, doc) => {
		const user = Meteor.users.findOne({_id: userId});

		doc.owner = (user && user.profile)? user.profile.name : "Unknown";
		doc.userId = userId;
		doc.published = false;
        doc.creationDate = new Date();
	});

	Listings.after.insert((userId, doc) => {
		if(Manufacturers.find({name: {$regex: doc.manufacturer, $options: 'i'}}).count()===0) {
			Manufacturers.insert({name: doc.manufacturer});
		}
	});

	Listings.allow({
		insert(userId, doc) {
			if(!userId) return false;

			delete doc.userId;
			delete doc.owner;

			check(doc, getLastSchema());

			return true;
		},
		update(userId, doc, fields, modifier) {
			if(Meteor.user() && Roles.userIsInRole(Meteor.userId(), 'admin')) {
				return true;
			}

			if(!userId || doc.userId!==userId) {
				return false;
			}

			fields = _.without(fields, "userId", "owner", "authorized", "published");

			if(_.difference(fields, getLastSchema()._schemaKeys).length>0) {
				return false;
			}

			return true;
		},
		remove(userId, doc){
			if(Meteor.user() && Roles.userIsInRole(Meteor.userId(), 'admin')) {
				return true;
			}

			if(!userId || doc.userId!==userId) {
				return false;
			}

			return true;
		},
		fetch: ['userId']
	});

	function getLastSchema(){
		const lastSchema = AdFormSchema.findOne();

		delete lastSchema._id;

		return new SimpleSchema(lastSchema);
	};
}
